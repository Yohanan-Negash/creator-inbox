import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";
const uppercaseLevel = winston.format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

const loggerFormat = isProduction
  ? winston.format.combine(
      uppercaseLevel(),
      winston.format.timestamp(),
      winston.format.json(),
    )
  : winston.format.combine(
      uppercaseLevel(),
      winston.format.colorize({ level: true }),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaText = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} ${level}: ${message}${metaText}`;
      }),
    );

export const logger = winston.createLogger({
    level: "info",
    format: loggerFormat,
    transports: [new winston.transports.Console()],
});
