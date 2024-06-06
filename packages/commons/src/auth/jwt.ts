import jwt, { JwtHeader, JwtPayload, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import {
  AuthData,
  AuthToken,
  KeySchema,
  PublicKey,
  getAuthDataFromToken,
} from "./authData.js";
import { Logger } from "winston";
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

async function getKeyKid(
  client: jwksClient.JwksClient,
): Promise<PublicKey | undefined> {
  const keys = await client.getKeys();
  const result = KeySchema.safeParse(keys);
  if (result.success) {
    return result.data;
  }
  return undefined;
}

const getKey =
  (
    clients: jwksClient.JwksClient[],
    logger: Logger,
  ): ((header: JwtHeader, callback: SigningKeyCallback) => void) =>
  async (header, callback) => {
    for (const { client, last } of clients.map((c, i) => ({
      client: c,
      last: i === clients.length - 1,
    }))) {
      const key = await getKeyKid(client);
      let kid = header.kid;
      if (!kid && key && key[0]) {
        kid = key[0].kid;
      }
      await client.getSigningKey(header.kid ?? kid, function (err, key) {
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
