import jwt, { JwtPayload } from "jsonwebtoken";
import { z } from "zod";
import { ZodiosRouterContextRequestHandler } from "@zodios/express";
import { ExpressContext } from "../index.js";
export const AuthToken = z.object({
  purpose_id: z.string().uuid(),
});

export type AuthToken = z.infer<typeof AuthToken>;
export const AuthData = z.object({
  purpose_id: z.string(),
});
export const ParsedHeaders = z
  .object({
    correlationId: z.string(),
  })
  .and(AuthData);
export type ParsedHeaders = z.infer<typeof ParsedHeaders>;

export const Headers = z.object({
  authorization: z.string().nullish(),
  "x-correlation-id": z.string().nullish(),
});

export type Headers = z.infer<typeof Headers>;
export type AuthData = z.infer<typeof AuthData>;
export const authenticationMiddleware: ZodiosRouterContextRequestHandler<
  ExpressContext
> = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json("Missing bearer").end();
    }
    const jwtToken = authHeader.split(" ")[1];
    const decodedToken = decodeJwtToken(jwtToken);
    req.ctx.authData = { purpose_id: decodedToken?.purpose_id }; // Add purpose_id to context
    return next();
  } catch (error) {
    console.error(
      `Authentication error for ${req.method} ${req.url}: ${error}`,
    );
    return res
      .status(500)
      .json({ code: "serverError", message: "Internal Server Error" })
      .end();
  }
};

const decodeJwtToken = (jwtToken: string): JwtPayload | null => {
  try {
    return jwt.decode(jwtToken, { json: true });
  } catch (err) {
    throw "jwtDecodingError(err)";
  }
};
