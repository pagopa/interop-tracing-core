import jwt, { JwtHeader, JwtPayload, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { AuthData, AuthToken, getAuthDataFromToken } from "./authData.js";
import { Logger } from "../logging/index.js";
import { JWTConfig } from "../index.js";
import { invalidClaim, jwtDecodingError } from "pagopa-interop-tracing-models";

const decodeJwtToken = (jwtToken: string): JwtPayload | null => {
  try {
    return jwt.decode(jwtToken, { json: true });
  } catch (err) {
    throw jwtDecodingError(err);
  }
};

export const readAuthDataFromJwtToken = (jwtToken: string): AuthData => {
  const decoded = decodeJwtToken(jwtToken);
  const token = AuthToken.safeParse(decoded);
  if (token.success === false) {
    throw invalidClaim(token.error);
  } else {
    return getAuthDataFromToken(token.data);
  }
};

const getKey =
  (
    clients: jwksClient.JwksClient[],
    logger: Logger,
  ): ((header: JwtHeader, callback: SigningKeyCallback) => void) =>
  (header, callback) => {
    for (const { client, last } of clients.map((c, i) => ({
      client: c,
      last: i === clients.length - 1,
    }))) {
      client.getSigningKey(header.kid, function (err, key) {
        if (err && last) {
          logger.error(`Error getting signing key: ${err}`);
          return callback(err, undefined);
        } else {
          return callback(null, key?.getPublicKey());
        }
      });
    }
  };

export const verifyJwtToken = (
  jwtToken: string,
  logger: Logger,
): Promise<boolean> => {
  const config = JWTConfig.parse(process.env);
  const clients = config.wellKnownUrls.map((url) => {
    return jwksClient({
      jwksUri: url,
    });
  });
  return new Promise((resolve) => {
    jwt.verify(
      jwtToken,
      getKey(clients, logger),
      {
        audience: config.acceptedAudiences,
      },
      function (err) {
        if (err) {
          logger.warn(`Token verification failed: ${err}`);
          return resolve(false);
        }
        return resolve(true);
      },
    );
  });
};
