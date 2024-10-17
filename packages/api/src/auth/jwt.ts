import jwt, { JwtHeader, JwtPayload, Secret } from "jsonwebtoken";
import jwksClient, { JwksClient } from "jwks-rsa";
import { AuthToken } from "./authData.js";
import {
  invalidClaim,
  jwksSigningKeyError,
  jwtDecodingError,
} from "pagopa-interop-tracing-models";
import {
  JWTConfig,
  Logger,
  RequesterAuthData,
} from "pagopa-interop-tracing-commons";

const decodeJwtToken = (jwtToken: string): JwtPayload | null => {
  try {
    return jwt.decode(jwtToken, { json: true });
  } catch (err) {
    throw jwtDecodingError(err);
  }
};

export const decodeJwtTokenHeaders = (
  jwtToken: string,
  logger: Logger,
): JwtHeader | undefined => {
  try {
    const decoded = jwt.decode(jwtToken, { complete: true });
    return decoded?.header;
  } catch (err) {
    logger.error(`Error decoding JWT token: ${err}`);
    throw jwtDecodingError(err);
  }
};

export const readAuthDataFromJwtToken = (
  jwtToken: string,
): RequesterAuthData => {
  const token = AuthToken.safeParse(decodeJwtToken(jwtToken));
  if (token.error) {
    throw invalidClaim(token.error);
  }

  return RequesterAuthData.parse(token.data);
};

const getKey = async (
  clients: jwksClient.JwksClient[],
  kid: string,
  logger: Logger,
): Promise<Secret> => {
  for (const client of clients) {
    try {
      const signingKey = await client.getSigningKey(kid);
      return signingKey.getPublicKey();
    } catch (error) {
      // Continue to the next client
      logger.debug(`Skip Jwks client`);
    }
  }

  logger.error(`Error getting signing key`);
  throw jwksSigningKeyError();
};

export const verifyJwtToken = async (
  jwtToken: string,
  logger: Logger,
): Promise<boolean> => {
  const config = JWTConfig.parse(process.env);

  const jwtHeader = decodeJwtTokenHeaders(jwtToken, logger);
  if (!jwtHeader?.kid) {
    logger.warn("Token verification failed: missing kid");
    return Promise.resolve(false);
  }

  const secret: Secret = await getKey(
    getJwksClients(config),
    jwtHeader.kid,
    logger,
  );

  return new Promise((resolve) => {
    jwt.verify(
      jwtToken,
      secret,
      {
        audience: config.acceptedAudiences,
      },
      function (err: unknown) {
        if (err) {
          logger.warn(`Token verification failed: ${err}`);
          return resolve(false);
        }
        return resolve(true);
      },
    );
  });
};

export function getJwksClients(config: JWTConfig): JwksClient[] {
  return config.wellKnownUrls.map((url) =>
    jwksClient({
      cache: true,
      rateLimit: true,
      jwksUri: url,
      /* If JWKS_CACHE_MAX_AGE_MILLIS not provided using 10 minute like default value: 
      https://github.com/auth0/node-jwks-rsa/blob/master/EXAMPLES.md#configuration 
      */
      cacheMaxAge: config.jwksCacheMaxAge ?? 600000,
    }),
  );
}
