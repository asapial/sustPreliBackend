// src/server.ts
import "dotenv/config";

// src/app.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";

// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

// src/lib/prisma.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

// prisma/generated/prisma/client.ts
import * as path from "path";
import { fileURLToPath } from "url";

// prisma/generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.8.0",
  "engineVersion": "3c6e192761c0362d496ed980de936e2f3cebcd3a",
  "activeProvider": "postgresql",
  "inlineSchema": 'model User {\n  id            String    @id\n  name          String\n  email         String\n  emailVerified Boolean   @default(false)\n  image         String?\n  createdAt     DateTime  @default(now())\n  updatedAt     DateTime  @updatedAt\n  sessions      Session[]\n  accounts      Account[]\n\n  @@unique([email])\n  @@map("user")\n}\n\nmodel Session {\n  id        String   @id\n  expiresAt DateTime\n  token     String\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n  ipAddress String?\n  userAgent String?\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([token])\n  @@index([userId])\n  @@map("session")\n}\n\nmodel Account {\n  id                    String    @id\n  accountId             String\n  providerId            String\n  userId                String\n  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n  accessToken           String?\n  refreshToken          String?\n  idToken               String?\n  accessTokenExpiresAt  DateTime?\n  refreshTokenExpiresAt DateTime?\n  scope                 String?\n  password              String?\n  createdAt             DateTime  @default(now())\n  updatedAt             DateTime  @updatedAt\n\n  @@index([userId])\n  @@map("account")\n}\n\nmodel Verification {\n  id         String   @id\n  identifier String\n  value      String\n  expiresAt  DateTime\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@index([identifier])\n  @@map("verification")\n}\n\nenum Role {\n  ADMIN\n  TEACHER\n  STUDENT\n}\n\n// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\n// Get a free hosted Postgres database in seconds: `npx create-db`\n\ngenerator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\n// \u2500\u2500 QueueStorm Investigator \u2014 Optional Logging Models \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n\nmodel TicketAnalysisLog {\n  id                    String   @id @default(cuid())\n  ticketId              String\n  complaintPreview      String\n  language              String?\n  channel               String?\n  userType              String?\n  caseType              String\n  evidenceVerdict       String\n  relevantTransactionId String?\n  severity              String\n  department            String\n  humanReviewRequired   Boolean\n  confidence            Float?\n  reasonCodesJson       String?\n  createdAt             DateTime @default(now())\n\n  @@map("ticket_analysis_log")\n}\n\nmodel SafetyEventLog {\n  id        String   @id @default(cuid())\n  ticketId  String?\n  eventType String\n  detail    String\n  createdAt DateTime @default(now())\n\n  @@map("safety_event_log")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"emailVerified","kind":"scalar","type":"Boolean"},{"name":"image","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"sessions","kind":"object","type":"Session","relationName":"SessionToUser"},{"name":"accounts","kind":"object","type":"Account","relationName":"AccountToUser"}],"dbName":"user"},"Session":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"token","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"userAgent","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"SessionToUser"}],"dbName":"session"},"Account":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"accountId","kind":"scalar","type":"String"},{"name":"providerId","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AccountToUser"},{"name":"accessToken","kind":"scalar","type":"String"},{"name":"refreshToken","kind":"scalar","type":"String"},{"name":"idToken","kind":"scalar","type":"String"},{"name":"accessTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"refreshTokenExpiresAt","kind":"scalar","type":"DateTime"},{"name":"scope","kind":"scalar","type":"String"},{"name":"password","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"account"},"Verification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"identifier","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"verification"},"TicketAnalysisLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"ticketId","kind":"scalar","type":"String"},{"name":"complaintPreview","kind":"scalar","type":"String"},{"name":"language","kind":"scalar","type":"String"},{"name":"channel","kind":"scalar","type":"String"},{"name":"userType","kind":"scalar","type":"String"},{"name":"caseType","kind":"scalar","type":"String"},{"name":"evidenceVerdict","kind":"scalar","type":"String"},{"name":"relevantTransactionId","kind":"scalar","type":"String"},{"name":"severity","kind":"scalar","type":"String"},{"name":"department","kind":"scalar","type":"String"},{"name":"humanReviewRequired","kind":"scalar","type":"Boolean"},{"name":"confidence","kind":"scalar","type":"Float"},{"name":"reasonCodesJson","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":"ticket_analysis_log"},"SafetyEventLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"ticketId","kind":"scalar","type":"String"},{"name":"eventType","kind":"scalar","type":"String"},{"name":"detail","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":"safety_event_log"}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","user","sessions","accounts","_count","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_min","_max","User.groupBy","User.aggregate","Session.findUnique","Session.findUniqueOrThrow","Session.findFirst","Session.findFirstOrThrow","Session.findMany","Session.createOne","Session.createMany","Session.createManyAndReturn","Session.updateOne","Session.updateMany","Session.updateManyAndReturn","Session.upsertOne","Session.deleteOne","Session.deleteMany","Session.groupBy","Session.aggregate","Account.findUnique","Account.findUniqueOrThrow","Account.findFirst","Account.findFirstOrThrow","Account.findMany","Account.createOne","Account.createMany","Account.createManyAndReturn","Account.updateOne","Account.updateMany","Account.updateManyAndReturn","Account.upsertOne","Account.deleteOne","Account.deleteMany","Account.groupBy","Account.aggregate","Verification.findUnique","Verification.findUniqueOrThrow","Verification.findFirst","Verification.findFirstOrThrow","Verification.findMany","Verification.createOne","Verification.createMany","Verification.createManyAndReturn","Verification.updateOne","Verification.updateMany","Verification.updateManyAndReturn","Verification.upsertOne","Verification.deleteOne","Verification.deleteMany","Verification.groupBy","Verification.aggregate","TicketAnalysisLog.findUnique","TicketAnalysisLog.findUniqueOrThrow","TicketAnalysisLog.findFirst","TicketAnalysisLog.findFirstOrThrow","TicketAnalysisLog.findMany","TicketAnalysisLog.createOne","TicketAnalysisLog.createMany","TicketAnalysisLog.createManyAndReturn","TicketAnalysisLog.updateOne","TicketAnalysisLog.updateMany","TicketAnalysisLog.updateManyAndReturn","TicketAnalysisLog.upsertOne","TicketAnalysisLog.deleteOne","TicketAnalysisLog.deleteMany","_avg","_sum","TicketAnalysisLog.groupBy","TicketAnalysisLog.aggregate","SafetyEventLog.findUnique","SafetyEventLog.findUniqueOrThrow","SafetyEventLog.findFirst","SafetyEventLog.findFirstOrThrow","SafetyEventLog.findMany","SafetyEventLog.createOne","SafetyEventLog.createMany","SafetyEventLog.createManyAndReturn","SafetyEventLog.updateOne","SafetyEventLog.updateMany","SafetyEventLog.updateManyAndReturn","SafetyEventLog.upsertOne","SafetyEventLog.deleteOne","SafetyEventLog.deleteMany","SafetyEventLog.groupBy","SafetyEventLog.aggregate","AND","OR","NOT","id","ticketId","eventType","detail","createdAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","complaintPreview","language","channel","userType","caseType","evidenceVerdict","relevantTransactionId","severity","department","humanReviewRequired","confidence","reasonCodesJson","identifier","value","expiresAt","updatedAt","accountId","providerId","userId","accessToken","refreshToken","idToken","accessTokenExpiresAt","refreshTokenExpiresAt","scope","password","token","ipAddress","userAgent","name","email","emailVerified","image","every","some","none","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide"]'),
  graph: "jQI0YAwEAAC-AQAgBQAAvwEAIG8AAL0BADBwAAAOABBxAAC9AQAwcgEAAAABdkAAqgEAIZEBQACqAQAhnwEBAKgBACGgAQEAAAABoQEgALMBACGiAQEAqQEAIQEAAAABACAMAwAAwgEAIG8AAMMBADBwAAADABBxAADDAQAwcgEAqAEAIXZAAKoBACGQAUAAqgEAIZEBQACqAQAhlAEBAKgBACGcAQEAqAEAIZ0BAQCpAQAhngEBAKkBACEDAwAAgQIAIJ0BAADEAQAgngEAAMQBACAMAwAAwgEAIG8AAMMBADBwAAADABBxAADDAQAwcgEAAAABdkAAqgEAIZABQACqAQAhkQFAAKoBACGUAQEAqAEAIZwBAQAAAAGdAQEAqQEAIZ4BAQCpAQAhAwAAAAMAIAEAAAQAMAIAAAUAIBEDAADCAQAgbwAAwAEAMHAAAAcAEHEAAMABADByAQCoAQAhdkAAqgEAIZEBQACqAQAhkgEBAKgBACGTAQEAqAEAIZQBAQCoAQAhlQEBAKkBACGWAQEAqQEAIZcBAQCpAQAhmAFAAMEBACGZAUAAwQEAIZoBAQCpAQAhmwEBAKkBACEIAwAAgQIAIJUBAADEAQAglgEAAMQBACCXAQAAxAEAIJgBAADEAQAgmQEAAMQBACCaAQAAxAEAIJsBAADEAQAgEQMAAMIBACBvAADAAQAwcAAABwAQcQAAwAEAMHIBAAAAAXZAAKoBACGRAUAAqgEAIZIBAQCoAQAhkwEBAKgBACGUAQEAqAEAIZUBAQCpAQAhlgEBAKkBACGXAQEAqQEAIZgBQADBAQAhmQFAAMEBACGaAQEAqQEAIZsBAQCpAQAhAwAAAAcAIAEAAAgAMAIAAAkAIAEAAAADACABAAAABwAgAQAAAAEAIAwEAAC-AQAgBQAAvwEAIG8AAL0BADBwAAAOABBxAAC9AQAwcgEAqAEAIXZAAKoBACGRAUAAqgEAIZ8BAQCoAQAhoAEBAKgBACGhASAAswEAIaIBAQCpAQAhAwQAAP8BACAFAACAAgAgogEAAMQBACADAAAADgAgAQAADwAwAgAAAQAgAwAAAA4AIAEAAA8AMAIAAAEAIAMAAAAOACABAAAPADACAAABACAJBAAA_QEAIAUAAP4BACByAQAAAAF2QAAAAAGRAUAAAAABnwEBAAAAAaABAQAAAAGhASAAAAABogEBAAAAAQEMAAATACAHcgEAAAABdkAAAAABkQFAAAAAAZ8BAQAAAAGgAQEAAAABoQEgAAAAAaIBAQAAAAEBDAAAFQAwAQwAABUAMAkEAADjAQAgBQAA5AEAIHIBAMgBACF2QADKAQAhkQFAAMoBACGfAQEAyAEAIaABAQDIAQAhoQEgANABACGiAQEAyQEAIQIAAAABACAMAAAYACAHcgEAyAEAIXZAAMoBACGRAUAAygEAIZ8BAQDIAQAhoAEBAMgBACGhASAA0AEAIaIBAQDJAQAhAgAAAA4AIAwAABoAIAIAAAAOACAMAAAaACADAAAAAQAgEwAAEwAgFAAAGAAgAQAAAAEAIAEAAAAOACAEBgAA4AEAIBkAAOIBACAaAADhAQAgogEAAMQBACAKbwAAvAEAMHAAACEAEHEAALwBADByAQCcAQAhdkAAngEAIZEBQACeAQAhnwEBAJwBACGgAQEAnAEAIaEBIACsAQAhogEBAJ0BACEDAAAADgAgAQAAIAAwGAAAIQAgAwAAAA4AIAEAAA8AMAIAAAEAIAEAAAAFACABAAAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgCQMAAN8BACByAQAAAAF2QAAAAAGQAUAAAAABkQFAAAAAAZQBAQAAAAGcAQEAAAABnQEBAAAAAZ4BAQAAAAEBDAAAKQAgCHIBAAAAAXZAAAAAAZABQAAAAAGRAUAAAAABlAEBAAAAAZwBAQAAAAGdAQEAAAABngEBAAAAAQEMAAArADABDAAAKwAwCQMAAN4BACByAQDIAQAhdkAAygEAIZABQADKAQAhkQFAAMoBACGUAQEAyAEAIZwBAQDIAQAhnQEBAMkBACGeAQEAyQEAIQIAAAAFACAMAAAuACAIcgEAyAEAIXZAAMoBACGQAUAAygEAIZEBQADKAQAhlAEBAMgBACGcAQEAyAEAIZ0BAQDJAQAhngEBAMkBACECAAAAAwAgDAAAMAAgAgAAAAMAIAwAADAAIAMAAAAFACATAAApACAUAAAuACABAAAABQAgAQAAAAMAIAUGAADbAQAgGQAA3QEAIBoAANwBACCdAQAAxAEAIJ4BAADEAQAgC28AALsBADBwAAA3ABBxAAC7AQAwcgEAnAEAIXZAAJ4BACGQAUAAngEAIZEBQACeAQAhlAEBAJwBACGcAQEAnAEAIZ0BAQCdAQAhngEBAJ0BACEDAAAAAwAgAQAANgAwGAAANwAgAwAAAAMAIAEAAAQAMAIAAAUAIAEAAAAJACABAAAACQAgAwAAAAcAIAEAAAgAMAIAAAkAIAMAAAAHACABAAAIADACAAAJACADAAAABwAgAQAACAAwAgAACQAgDgMAANoBACByAQAAAAF2QAAAAAGRAUAAAAABkgEBAAAAAZMBAQAAAAGUAQEAAAABlQEBAAAAAZYBAQAAAAGXAQEAAAABmAFAAAAAAZkBQAAAAAGaAQEAAAABmwEBAAAAAQEMAAA_ACANcgEAAAABdkAAAAABkQFAAAAAAZIBAQAAAAGTAQEAAAABlAEBAAAAAZUBAQAAAAGWAQEAAAABlwEBAAAAAZgBQAAAAAGZAUAAAAABmgEBAAAAAZsBAQAAAAEBDAAAQQAwAQwAAEEAMA4DAADZAQAgcgEAyAEAIXZAAMoBACGRAUAAygEAIZIBAQDIAQAhkwEBAMgBACGUAQEAyAEAIZUBAQDJAQAhlgEBAMkBACGXAQEAyQEAIZgBQADYAQAhmQFAANgBACGaAQEAyQEAIZsBAQDJAQAhAgAAAAkAIAwAAEQAIA1yAQDIAQAhdkAAygEAIZEBQADKAQAhkgEBAMgBACGTAQEAyAEAIZQBAQDIAQAhlQEBAMkBACGWAQEAyQEAIZcBAQDJAQAhmAFAANgBACGZAUAA2AEAIZoBAQDJAQAhmwEBAMkBACECAAAABwAgDAAARgAgAgAAAAcAIAwAAEYAIAMAAAAJACATAAA_ACAUAABEACABAAAACQAgAQAAAAcAIAoGAADVAQAgGQAA1wEAIBoAANYBACCVAQAAxAEAIJYBAADEAQAglwEAAMQBACCYAQAAxAEAIJkBAADEAQAgmgEAAMQBACCbAQAAxAEAIBBvAAC3AQAwcAAATQAQcQAAtwEAMHIBAJwBACF2QACeAQAhkQFAAJ4BACGSAQEAnAEAIZMBAQCcAQAhlAEBAJwBACGVAQEAnQEAIZYBAQCdAQAhlwEBAJ0BACGYAUAAuAEAIZkBQAC4AQAhmgEBAJ0BACGbAQEAnQEAIQMAAAAHACABAABMADAYAABNACADAAAABwAgAQAACAAwAgAACQAgCW8AALYBADBwAABTABBxAAC2AQAwcgEAAAABdkAAqgEAIY4BAQCoAQAhjwEBAKgBACGQAUAAqgEAIZEBQACqAQAhAQAAAFAAIAEAAABQACAJbwAAtgEAMHAAAFMAEHEAALYBADByAQCoAQAhdkAAqgEAIY4BAQCoAQAhjwEBAKgBACGQAUAAqgEAIZEBQACqAQAhAAMAAABTACABAABUADACAABQACADAAAAUwAgAQAAVAAwAgAAUAAgAwAAAFMAIAEAAFQAMAIAAFAAIAZyAQAAAAF2QAAAAAGOAQEAAAABjwEBAAAAAZABQAAAAAGRAUAAAAABAQwAAFgAIAZyAQAAAAF2QAAAAAGOAQEAAAABjwEBAAAAAZABQAAAAAGRAUAAAAABAQwAAFoAMAEMAABaADAGcgEAyAEAIXZAAMoBACGOAQEAyAEAIY8BAQDIAQAhkAFAAMoBACGRAUAAygEAIQIAAABQACAMAABdACAGcgEAyAEAIXZAAMoBACGOAQEAyAEAIY8BAQDIAQAhkAFAAMoBACGRAUAAygEAIQIAAABTACAMAABfACACAAAAUwAgDAAAXwAgAwAAAFAAIBMAAFgAIBQAAF0AIAEAAABQACABAAAAUwAgAwYAANIBACAZAADUAQAgGgAA0wEAIAlvAAC1AQAwcAAAZgAQcQAAtQEAMHIBAJwBACF2QACeAQAhjgEBAJwBACGPAQEAnAEAIZABQACeAQAhkQFAAJ4BACEDAAAAUwAgAQAAZQAwGAAAZgAgAwAAAFMAIAEAAFQAMAIAAFAAIBJvAACyAQAwcAAAbAAQcQAAsgEAMHIBAAAAAXMBAKgBACF2QACqAQAhggEBAKgBACGDAQEAqQEAIYQBAQCpAQAhhQEBAKkBACGGAQEAqAEAIYcBAQCoAQAhiAEBAKkBACGJAQEAqAEAIYoBAQCoAQAhiwEgALMBACGMAQgAtAEAIY0BAQCpAQAhAQAAAGkAIAEAAABpACASbwAAsgEAMHAAAGwAEHEAALIBADByAQCoAQAhcwEAqAEAIXZAAKoBACGCAQEAqAEAIYMBAQCpAQAhhAEBAKkBACGFAQEAqQEAIYYBAQCoAQAhhwEBAKgBACGIAQEAqQEAIYkBAQCoAQAhigEBAKgBACGLASAAswEAIYwBCAC0AQAhjQEBAKkBACEGgwEAAMQBACCEAQAAxAEAIIUBAADEAQAgiAEAAMQBACCMAQAAxAEAII0BAADEAQAgAwAAAGwAIAEAAG0AMAIAAGkAIAMAAABsACABAABtADACAABpACADAAAAbAAgAQAAbQAwAgAAaQAgD3IBAAAAAXMBAAAAAXZAAAAAAYIBAQAAAAGDAQEAAAABhAEBAAAAAYUBAQAAAAGGAQEAAAABhwEBAAAAAYgBAQAAAAGJAQEAAAABigEBAAAAAYsBIAAAAAGMAQgAAAABjQEBAAAAAQEMAABxACAPcgEAAAABcwEAAAABdkAAAAABggEBAAAAAYMBAQAAAAGEAQEAAAABhQEBAAAAAYYBAQAAAAGHAQEAAAABiAEBAAAAAYkBAQAAAAGKAQEAAAABiwEgAAAAAYwBCAAAAAGNAQEAAAABAQwAAHMAMAEMAABzADAPcgEAyAEAIXMBAMgBACF2QADKAQAhggEBAMgBACGDAQEAyQEAIYQBAQDJAQAhhQEBAMkBACGGAQEAyAEAIYcBAQDIAQAhiAEBAMkBACGJAQEAyAEAIYoBAQDIAQAhiwEgANABACGMAQgA0QEAIY0BAQDJAQAhAgAAAGkAIAwAAHYAIA9yAQDIAQAhcwEAyAEAIXZAAMoBACGCAQEAyAEAIYMBAQDJAQAhhAEBAMkBACGFAQEAyQEAIYYBAQDIAQAhhwEBAMgBACGIAQEAyQEAIYkBAQDIAQAhigEBAMgBACGLASAA0AEAIYwBCADRAQAhjQEBAMkBACECAAAAbAAgDAAAeAAgAgAAAGwAIAwAAHgAIAMAAABpACATAABxACAUAAB2ACABAAAAaQAgAQAAAGwAIAsGAADLAQAgGQAAzgEAIBoAAM0BACBbAADMAQAgXAAAzwEAIIMBAADEAQAghAEAAMQBACCFAQAAxAEAIIgBAADEAQAgjAEAAMQBACCNAQAAxAEAIBJvAACrAQAwcAAAfwAQcQAAqwEAMHIBAJwBACFzAQCcAQAhdkAAngEAIYIBAQCcAQAhgwEBAJ0BACGEAQEAnQEAIYUBAQCdAQAhhgEBAJwBACGHAQEAnAEAIYgBAQCdAQAhiQEBAJwBACGKAQEAnAEAIYsBIACsAQAhjAEIAK0BACGNAQEAnQEAIQMAAABsACABAAB-ADAYAAB_ACADAAAAbAAgAQAAbQAwAgAAaQAgCG8AAKcBADBwAACFAQAQcQAApwEAMHIBAAAAAXMBAKkBACF0AQCoAQAhdQEAqAEAIXZAAKoBACEBAAAAggEAIAEAAACCAQAgCG8AAKcBADBwAACFAQAQcQAApwEAMHIBAKgBACFzAQCpAQAhdAEAqAEAIXUBAKgBACF2QACqAQAhAXMAAMQBACADAAAAhQEAIAEAAIYBADACAACCAQAgAwAAAIUBACABAACGAQAwAgAAggEAIAMAAACFAQAgAQAAhgEAMAIAAIIBACAFcgEAAAABcwEAAAABdAEAAAABdQEAAAABdkAAAAABAQwAAIoBACAFcgEAAAABcwEAAAABdAEAAAABdQEAAAABdkAAAAABAQwAAIwBADABDAAAjAEAMAVyAQDIAQAhcwEAyQEAIXQBAMgBACF1AQDIAQAhdkAAygEAIQIAAACCAQAgDAAAjwEAIAVyAQDIAQAhcwEAyQEAIXQBAMgBACF1AQDIAQAhdkAAygEAIQIAAACFAQAgDAAAkQEAIAIAAACFAQAgDAAAkQEAIAMAAACCAQAgEwAAigEAIBQAAI8BACABAAAAggEAIAEAAACFAQAgBAYAAMUBACAZAADHAQAgGgAAxgEAIHMAAMQBACAIbwAAmwEAMHAAAJgBABBxAACbAQAwcgEAnAEAIXMBAJ0BACF0AQCcAQAhdQEAnAEAIXZAAJ4BACEDAAAAhQEAIAEAAJcBADAYAACYAQAgAwAAAIUBACABAACGAQAwAgAAggEAIAhvAACbAQAwcAAAmAEAEHEAAJsBADByAQCcAQAhcwEAnQEAIXQBAJwBACF1AQCcAQAhdkAAngEAIQ4GAACgAQAgGQAApgEAIBoAAKYBACB3AQAAAAF4AQAAAAR5AQAAAAR6AQAAAAF7AQAAAAF8AQAAAAF9AQAAAAF-AQClAQAhfwEAAAABgAEBAAAAAYEBAQAAAAEOBgAAowEAIBkAAKQBACAaAACkAQAgdwEAAAABeAEAAAAFeQEAAAAFegEAAAABewEAAAABfAEAAAABfQEAAAABfgEAogEAIX8BAAAAAYABAQAAAAGBAQEAAAABCwYAAKABACAZAAChAQAgGgAAoQEAIHdAAAAAAXhAAAAABHlAAAAABHpAAAAAAXtAAAAAAXxAAAAAAX1AAAAAAX5AAJ8BACELBgAAoAEAIBkAAKEBACAaAAChAQAgd0AAAAABeEAAAAAEeUAAAAAEekAAAAABe0AAAAABfEAAAAABfUAAAAABfkAAnwEAIQh3AgAAAAF4AgAAAAR5AgAAAAR6AgAAAAF7AgAAAAF8AgAAAAF9AgAAAAF-AgCgAQAhCHdAAAAAAXhAAAAABHlAAAAABHpAAAAAAXtAAAAAAXxAAAAAAX1AAAAAAX5AAKEBACEOBgAAowEAIBkAAKQBACAaAACkAQAgdwEAAAABeAEAAAAFeQEAAAAFegEAAAABewEAAAABfAEAAAABfQEAAAABfgEAogEAIX8BAAAAAYABAQAAAAGBAQEAAAABCHcCAAAAAXgCAAAABXkCAAAABXoCAAAAAXsCAAAAAXwCAAAAAX0CAAAAAX4CAKMBACELdwEAAAABeAEAAAAFeQEAAAAFegEAAAABewEAAAABfAEAAAABfQEAAAABfgEApAEAIX8BAAAAAYABAQAAAAGBAQEAAAABDgYAAKABACAZAACmAQAgGgAApgEAIHcBAAAAAXgBAAAABHkBAAAABHoBAAAAAXsBAAAAAXwBAAAAAX0BAAAAAX4BAKUBACF_AQAAAAGAAQEAAAABgQEBAAAAAQt3AQAAAAF4AQAAAAR5AQAAAAR6AQAAAAF7AQAAAAF8AQAAAAF9AQAAAAF-AQCmAQAhfwEAAAABgAEBAAAAAYEBAQAAAAEIbwAApwEAMHAAAIUBABBxAACnAQAwcgEAqAEAIXMBAKkBACF0AQCoAQAhdQEAqAEAIXZAAKoBACELdwEAAAABeAEAAAAEeQEAAAAEegEAAAABewEAAAABfAEAAAABfQEAAAABfgEApgEAIX8BAAAAAYABAQAAAAGBAQEAAAABC3cBAAAAAXgBAAAABXkBAAAABXoBAAAAAXsBAAAAAXwBAAAAAX0BAAAAAX4BAKQBACF_AQAAAAGAAQEAAAABgQEBAAAAAQh3QAAAAAF4QAAAAAR5QAAAAAR6QAAAAAF7QAAAAAF8QAAAAAF9QAAAAAF-QAChAQAhEm8AAKsBADBwAAB_ABBxAACrAQAwcgEAnAEAIXMBAJwBACF2QACeAQAhggEBAJwBACGDAQEAnQEAIYQBAQCdAQAhhQEBAJ0BACGGAQEAnAEAIYcBAQCcAQAhiAEBAJ0BACGJAQEAnAEAIYoBAQCcAQAhiwEgAKwBACGMAQgArQEAIY0BAQCdAQAhBQYAAKABACAZAACxAQAgGgAAsQEAIHcgAAAAAX4gALABACENBgAAowEAIBkAAK8BACAaAACvAQAgWwAArwEAIFwAAK8BACB3CAAAAAF4CAAAAAV5CAAAAAV6CAAAAAF7CAAAAAF8CAAAAAF9CAAAAAF-CACuAQAhDQYAAKMBACAZAACvAQAgGgAArwEAIFsAAK8BACBcAACvAQAgdwgAAAABeAgAAAAFeQgAAAAFeggAAAABewgAAAABfAgAAAABfQgAAAABfggArgEAIQh3CAAAAAF4CAAAAAV5CAAAAAV6CAAAAAF7CAAAAAF8CAAAAAF9CAAAAAF-CACvAQAhBQYAAKABACAZAACxAQAgGgAAsQEAIHcgAAAAAX4gALABACECdyAAAAABfiAAsQEAIRJvAACyAQAwcAAAbAAQcQAAsgEAMHIBAKgBACFzAQCoAQAhdkAAqgEAIYIBAQCoAQAhgwEBAKkBACGEAQEAqQEAIYUBAQCpAQAhhgEBAKgBACGHAQEAqAEAIYgBAQCpAQAhiQEBAKgBACGKAQEAqAEAIYsBIACzAQAhjAEIALQBACGNAQEAqQEAIQJ3IAAAAAF-IACxAQAhCHcIAAAAAXgIAAAABXkIAAAABXoIAAAAAXsIAAAAAXwIAAAAAX0IAAAAAX4IAK8BACEJbwAAtQEAMHAAAGYAEHEAALUBADByAQCcAQAhdkAAngEAIY4BAQCcAQAhjwEBAJwBACGQAUAAngEAIZEBQACeAQAhCW8AALYBADBwAABTABBxAAC2AQAwcgEAqAEAIXZAAKoBACGOAQEAqAEAIY8BAQCoAQAhkAFAAKoBACGRAUAAqgEAIRBvAAC3AQAwcAAATQAQcQAAtwEAMHIBAJwBACF2QACeAQAhkQFAAJ4BACGSAQEAnAEAIZMBAQCcAQAhlAEBAJwBACGVAQEAnQEAIZYBAQCdAQAhlwEBAJ0BACGYAUAAuAEAIZkBQAC4AQAhmgEBAJ0BACGbAQEAnQEAIQsGAACjAQAgGQAAugEAIBoAALoBACB3QAAAAAF4QAAAAAV5QAAAAAV6QAAAAAF7QAAAAAF8QAAAAAF9QAAAAAF-QAC5AQAhCwYAAKMBACAZAAC6AQAgGgAAugEAIHdAAAAAAXhAAAAABXlAAAAABXpAAAAAAXtAAAAAAXxAAAAAAX1AAAAAAX5AALkBACEId0AAAAABeEAAAAAFeUAAAAAFekAAAAABe0AAAAABfEAAAAABfUAAAAABfkAAugEAIQtvAAC7AQAwcAAANwAQcQAAuwEAMHIBAJwBACF2QACeAQAhkAFAAJ4BACGRAUAAngEAIZQBAQCcAQAhnAEBAJwBACGdAQEAnQEAIZ4BAQCdAQAhCm8AALwBADBwAAAhABBxAAC8AQAwcgEAnAEAIXZAAJ4BACGRAUAAngEAIZ8BAQCcAQAhoAEBAJwBACGhASAArAEAIaIBAQCdAQAhDAQAAL4BACAFAAC_AQAgbwAAvQEAMHAAAA4AEHEAAL0BADByAQCoAQAhdkAAqgEAIZEBQACqAQAhnwEBAKgBACGgAQEAqAEAIaEBIACzAQAhogEBAKkBACEDowEAAAMAIKQBAAADACClAQAAAwAgA6MBAAAHACCkAQAABwAgpQEAAAcAIBEDAADCAQAgbwAAwAEAMHAAAAcAEHEAAMABADByAQCoAQAhdkAAqgEAIZEBQACqAQAhkgEBAKgBACGTAQEAqAEAIZQBAQCoAQAhlQEBAKkBACGWAQEAqQEAIZcBAQCpAQAhmAFAAMEBACGZAUAAwQEAIZoBAQCpAQAhmwEBAKkBACEId0AAAAABeEAAAAAFeUAAAAAFekAAAAABe0AAAAABfEAAAAABfUAAAAABfkAAugEAIQ4EAAC-AQAgBQAAvwEAIG8AAL0BADBwAAAOABBxAAC9AQAwcgEAqAEAIXZAAKoBACGRAUAAqgEAIZ8BAQCoAQAhoAEBAKgBACGhASAAswEAIaIBAQCpAQAhpgEAAA4AIKcBAAAOACAMAwAAwgEAIG8AAMMBADBwAAADABBxAADDAQAwcgEAqAEAIXZAAKoBACGQAUAAqgEAIZEBQACqAQAhlAEBAKgBACGcAQEAqAEAIZ0BAQCpAQAhngEBAKkBACEAAAAAAasBAQAAAAEBqwEBAAAAAQGrAUAAAAABAAAAAAABqwEgAAAAAQWrAQgAAAABsQEIAAAAAbIBCAAAAAGzAQgAAAABtAEIAAAAAQAAAAAAAAGrAUAAAAABBRMAAIkCACAUAACMAgAgqAEAAIoCACCpAQAAiwIAIK4BAAABACADEwAAiQIAIKgBAACKAgAgrgEAAAEAIAAAAAUTAACEAgAgFAAAhwIAIKgBAACFAgAgqQEAAIYCACCuAQAAAQAgAxMAAIQCACCoAQAAhQIAIK4BAAABACAAAAALEwAA8QEAMBQAAPYBADCoAQAA8gEAMKkBAADzAQAwqgEAAPQBACCrAQAA9QEAMKwBAAD1AQAwrQEAAPUBADCuAQAA9QEAMK8BAAD3AQAwsAEAAPgBADALEwAA5QEAMBQAAOoBADCoAQAA5gEAMKkBAADnAQAwqgEAAOgBACCrAQAA6QEAMKwBAADpAQAwrQEAAOkBADCuAQAA6QEAMK8BAADrAQAwsAEAAOwBADAMcgEAAAABdkAAAAABkQFAAAAAAZIBAQAAAAGTAQEAAAABlQEBAAAAAZYBAQAAAAGXAQEAAAABmAFAAAAAAZkBQAAAAAGaAQEAAAABmwEBAAAAAQIAAAAJACATAADwAQAgAwAAAAkAIBMAAPABACAUAADvAQAgAQwAAIMCADARAwAAwgEAIG8AAMABADBwAAAHABBxAADAAQAwcgEAAAABdkAAqgEAIZEBQACqAQAhkgEBAKgBACGTAQEAqAEAIZQBAQCoAQAhlQEBAKkBACGWAQEAqQEAIZcBAQCpAQAhmAFAAMEBACGZAUAAwQEAIZoBAQCpAQAhmwEBAKkBACECAAAACQAgDAAA7wEAIAIAAADtAQAgDAAA7gEAIBBvAADsAQAwcAAA7QEAEHEAAOwBADByAQCoAQAhdkAAqgEAIZEBQACqAQAhkgEBAKgBACGTAQEAqAEAIZQBAQCoAQAhlQEBAKkBACGWAQEAqQEAIZcBAQCpAQAhmAFAAMEBACGZAUAAwQEAIZoBAQCpAQAhmwEBAKkBACEQbwAA7AEAMHAAAO0BABBxAADsAQAwcgEAqAEAIXZAAKoBACGRAUAAqgEAIZIBAQCoAQAhkwEBAKgBACGUAQEAqAEAIZUBAQCpAQAhlgEBAKkBACGXAQEAqQEAIZgBQADBAQAhmQFAAMEBACGaAQEAqQEAIZsBAQCpAQAhDHIBAMgBACF2QADKAQAhkQFAAMoBACGSAQEAyAEAIZMBAQDIAQAhlQEBAMkBACGWAQEAyQEAIZcBAQDJAQAhmAFAANgBACGZAUAA2AEAIZoBAQDJAQAhmwEBAMkBACEMcgEAyAEAIXZAAMoBACGRAUAAygEAIZIBAQDIAQAhkwEBAMgBACGVAQEAyQEAIZYBAQDJAQAhlwEBAMkBACGYAUAA2AEAIZkBQADYAQAhmgEBAMkBACGbAQEAyQEAIQxyAQAAAAF2QAAAAAGRAUAAAAABkgEBAAAAAZMBAQAAAAGVAQEAAAABlgEBAAAAAZcBAQAAAAGYAUAAAAABmQFAAAAAAZoBAQAAAAGbAQEAAAABB3IBAAAAAXZAAAAAAZABQAAAAAGRAUAAAAABnAEBAAAAAZ0BAQAAAAGeAQEAAAABAgAAAAUAIBMAAPwBACADAAAABQAgEwAA_AEAIBQAAPsBACABDAAAggIAMAwDAADCAQAgbwAAwwEAMHAAAAMAEHEAAMMBADByAQAAAAF2QACqAQAhkAFAAKoBACGRAUAAqgEAIZQBAQCoAQAhnAEBAAAAAZ0BAQCpAQAhngEBAKkBACECAAAABQAgDAAA-wEAIAIAAAD5AQAgDAAA-gEAIAtvAAD4AQAwcAAA-QEAEHEAAPgBADByAQCoAQAhdkAAqgEAIZABQACqAQAhkQFAAKoBACGUAQEAqAEAIZwBAQCoAQAhnQEBAKkBACGeAQEAqQEAIQtvAAD4AQAwcAAA-QEAEHEAAPgBADByAQCoAQAhdkAAqgEAIZABQACqAQAhkQFAAKoBACGUAQEAqAEAIZwBAQCoAQAhnQEBAKkBACGeAQEAqQEAIQdyAQDIAQAhdkAAygEAIZABQADKAQAhkQFAAMoBACGcAQEAyAEAIZ0BAQDJAQAhngEBAMkBACEHcgEAyAEAIXZAAMoBACGQAUAAygEAIZEBQADKAQAhnAEBAMgBACGdAQEAyQEAIZ4BAQDJAQAhB3IBAAAAAXZAAAAAAZABQAAAAAGRAUAAAAABnAEBAAAAAZ0BAQAAAAGeAQEAAAABBBMAAPEBADCoAQAA8gEAMKoBAAD0AQAgrgEAAPUBADAEEwAA5QEAMKgBAADmAQAwqgEAAOgBACCuAQAA6QEAMAAAAwQAAP8BACAFAACAAgAgogEAAMQBACAHcgEAAAABdkAAAAABkAFAAAAAAZEBQAAAAAGcAQEAAAABnQEBAAAAAZ4BAQAAAAEMcgEAAAABdkAAAAABkQFAAAAAAZIBAQAAAAGTAQEAAAABlQEBAAAAAZYBAQAAAAGXAQEAAAABmAFAAAAAAZkBQAAAAAGaAQEAAAABmwEBAAAAAQgFAAD-AQAgcgEAAAABdkAAAAABkQFAAAAAAZ8BAQAAAAGgAQEAAAABoQEgAAAAAaIBAQAAAAECAAAAAQAgEwAAhAIAIAMAAAAOACATAACEAgAgFAAAiAIAIAoAAAAOACAFAADkAQAgDAAAiAIAIHIBAMgBACF2QADKAQAhkQFAAMoBACGfAQEAyAEAIaABAQDIAQAhoQEgANABACGiAQEAyQEAIQgFAADkAQAgcgEAyAEAIXZAAMoBACGRAUAAygEAIZ8BAQDIAQAhoAEBAMgBACGhASAA0AEAIaIBAQDJAQAhCAQAAP0BACByAQAAAAF2QAAAAAGRAUAAAAABnwEBAAAAAaABAQAAAAGhASAAAAABogEBAAAAAQIAAAABACATAACJAgAgAwAAAA4AIBMAAIkCACAUAACNAgAgCgAAAA4AIAQAAOMBACAMAACNAgAgcgEAyAEAIXZAAMoBACGRAUAAygEAIZ8BAQDIAQAhoAEBAMgBACGhASAA0AEAIaIBAQDJAQAhCAQAAOMBACByAQDIAQAhdkAAygEAIZEBQADKAQAhnwEBAMgBACGgAQEAyAEAIaEBIADQAQAhogEBAMkBACEDBAYCBQoDBgAEAQMAAQEDAAECBAsABQwAAAAAAwYACRkAChoACwAAAAMGAAkZAAoaAAsBAwABAQMAAQMGABAZABEaABIAAAADBgAQGQARGgASAQMAAQEDAAEDBgAXGQAYGgAZAAAAAwYAFxkAGBoAGQAAAAMGAB8ZACAaACEAAAADBgAfGQAgGgAhAAAABQYAJxkAKhoAK1sAKFwAKQAAAAAABQYAJxkAKhoAK1sAKFwAKQAAAAMGADEZADIaADMAAAADBgAxGQAyGgAzBwIBCA0BCRABChEBCxIBDRQBDhYFDxcGEBkBERsFEhwHFR0BFh4BFx8FGyIIHCMMHSQCHiUCHyYCICcCISgCIioCIywFJC0NJS8CJjEFJzIOKDMCKTQCKjUFKzgPLDkTLToDLjsDLzwDMD0DMT4DMkADM0IFNEMUNUUDNkcFN0gVOEkDOUoDOksFO04WPE8aPVEbPlIbP1UbQFYbQVcbQlkbQ1sFRFwcRV4bRmAFR2EdSGIbSWMbSmQFS2ceTGgiTWojTmsjT24jUG8jUXAjUnIjU3QFVHUkVXcjVnkFV3olWHsjWXwjWn0FXYABJl6BASxfgwEtYIQBLWGHAS1iiAEtY4kBLWSLAS1ljQEFZo4BLmeQAS1okgEFaZMBL2qUAS1rlQEtbJYBBW2ZATBumgE0"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer } = await import("buffer");
  const wasmArray = Buffer.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// prisma/generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// prisma/generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// src/lib/prisma.ts
var connectionString = `${process.env.DATABASE_URL}`;
var adapter = new PrismaPg({ connectionString });
var prisma = new PrismaClient({ adapter });

// src/lib/auth.ts
var auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60
      // 5 minutes
    }
  },
  advanced: {
    cookiePrefix: "better-auth",
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: false
    },
    disableCSRFCheck: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      httpOnly: false
    }
  }
});

// src/index.ts
import { Router } from "express";
var router = Router();
var indexRouter = router;

// src/modules/analyze-ticket/analyze-ticket.route.ts
import { Router as Router2 } from "express";

// src/modules/analyze-ticket/analyze-ticket.controller.ts
import { ZodError } from "zod";

// src/modules/analyze-ticket/analyze-ticket.validation.ts
import { z } from "zod";
var TransactionEntrySchema = z.object({
  transaction_id: z.string(),
  timestamp: z.string(),
  type: z.enum(["transfer", "payment", "cash_in", "cash_out", "settlement", "refund"]).optional(),
  amount: z.number().optional(),
  counterparty: z.string().optional(),
  status: z.enum(["completed", "failed", "pending", "reversed"]).optional()
});
var AnalyzeTicketSchema = z.object({
  ticket_id: z.string().min(1, "ticket_id is required"),
  complaint: z.string().min(1, "complaint is required"),
  language: z.enum(["en", "bn", "mixed"]).optional(),
  channel: z.enum(["in_app_chat", "call_center", "email", "merchant_portal", "field_agent"]).optional(),
  user_type: z.enum(["customer", "merchant", "agent", "unknown"]).optional(),
  campaign_context: z.string().optional(),
  transaction_history: z.array(TransactionEntrySchema).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({})
});

// src/utils/normalize.ts
function normalizeComplaint(complaint) {
  return complaint.toLowerCase().replace(/\s+/g, " ").trim();
}
function extractSignals(rawComplaint) {
  const normalized = normalizeComplaint(rawComplaint);
  const txnIdPattern = /TXN-[A-Z0-9]+/gi;
  const mentionedTransactionIds = [...new Set((rawComplaint.match(txnIdPattern) || []).map((t) => t.toUpperCase()))];
  const amountPattern = /\b(\d{2,7}(?:[,\s]?\d{3})*(?:\.\d+)?)\s*(?:taka|bdt|tk|৳)?/gi;
  const amountMatches = [];
  let amountMatch;
  while ((amountMatch = amountPattern.exec(normalized)) !== null) {
    const num = parseFloat(amountMatch[1].replace(/,/g, ""));
    if (!isNaN(num) && num > 0) amountMatches.push(num);
  }
  const mentionedAmounts = [...new Set(amountMatches)];
  const phonePattern = /(?:\+88)?01[3-9]\d{8}/g;
  const mentionedCounterparties = [...new Set(rawComplaint.match(phonePattern) || [])];
  const pinOtpKeywords = [
    "pin",
    "otp",
    "password",
    "verification code",
    "\u09AA\u09BF\u09A8",
    "\u0993\u099F\u09BF\u09AA\u09BF",
    "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1",
    "\u09AA\u09BF\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0",
    "secret code",
    "4-digit",
    "6-digit"
  ];
  const hasPinOtpPasswordSignal = pinOtpKeywords.some((kw) => normalized.includes(kw));
  const scamKeywords = [
    "scam",
    "fraud",
    "fake call",
    "suspicious call",
    "phishing",
    "suspicious link",
    "click this link",
    "click the link",
    "account blocked",
    "\u09AA\u09C1\u09B0\u09B8\u09CD\u0995\u09BE\u09B0",
    "\u09AA\u09CD\u09B0\u09A4\u09BE\u09B0\u09A3\u09BE",
    "\u09AD\u09C1\u09AF\u09BC\u09BE",
    "suspicious message",
    "fake message",
    "hacked",
    "compromised",
    "unauthorized access",
    "verify your account",
    "send otp",
    "give otp",
    "share pin",
    "give pin",
    "share otp"
  ];
  const hasScamSignal = scamKeywords.some((kw) => normalized.includes(kw));
  const refundKeywords = [
    "refund",
    "return my money",
    "\u099F\u09BE\u0995\u09BE \u09AB\u09C7\u09B0\u09A4",
    "\u09AB\u09C7\u09B0\u09A4 \u099A\u09BE\u0987",
    "taka ferot",
    "money back",
    "get my money back",
    "want refund",
    "need refund"
  ];
  const hasRefundSignal = refundKeywords.some((kw) => normalized.includes(kw));
  const wrongTransferKeywords = [
    "wrong number",
    "wrong recipient",
    "wrong person",
    "sent to wrong",
    "wrong account",
    "\u09AD\u09C1\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0",
    "\u09AD\u09C1\u09B2 \u0995\u09B0\u09C7 \u09AA\u09BE\u09A0\u09BF\u09AF\u09BC\u09C7\u099B\u09BF",
    "bhul number",
    "mistakenly sent",
    "wrong transfer",
    "\u09AD\u09C1\u09B2 \u09AE\u09BE\u09A8\u09C1\u09B7",
    "\u0985\u09A8\u09CD\u09AF \u09A8\u09AE\u09CD\u09AC\u09B0\u09C7",
    "different number",
    "\u09AD\u09C1\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0\u09C7"
  ];
  const hasWrongTransferSignal = wrongTransferKeywords.some((kw) => normalized.includes(kw));
  const failedPaymentKeywords = [
    "failed",
    "payment failed",
    "transaction failed",
    "deducted but",
    "balance cut",
    "\u099F\u09BE\u0995\u09BE \u0995\u09C7\u099F\u09C7 \u0997\u09C7\u099B\u09C7",
    "\u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B9\u09AF\u09BC\u09A8\u09BF",
    "payment not received",
    "not completed",
    "\u099F\u09BE\u0995\u09BE \u0997\u09C7\u099B\u09C7",
    "money deducted",
    "balance deducted",
    "amount deducted",
    // Pending payments: customer explicitly says pending → treat as failed-payment workflow
    "payment is pending",
    "transaction is pending",
    "still pending",
    "shows pending"
  ];
  const hasFailedPaymentSignal = failedPaymentKeywords.some((kw) => normalized.includes(kw));
  const duplicateKeywords = [
    "charged twice",
    "paid twice",
    "double payment",
    "duplicate",
    "twice deducted",
    "\u09A6\u09C1\u0987\u09AC\u09BE\u09B0",
    "\u09A6\u09C1\u09AC\u09BE\u09B0",
    "duibar",
    "dui bar",
    "double charged",
    "billed twice",
    "multiple times",
    "two times",
    "charged two",
    "pay twice",
    "paying twice"
  ];
  const hasDuplicateSignal = duplicateKeywords.some((kw) => normalized.includes(kw));
  const merchantKeywords = [
    "settlement",
    "merchant settlement",
    "merchant portal",
    "\u09A6\u09CB\u0995\u09BE\u09A8\u09C7\u09B0 \u099F\u09BE\u0995\u09BE",
    "\u09AE\u09BE\u09B0\u09CD\u099A\u09C7\u09A8\u09CD\u099F",
    "shop payment",
    "business payment",
    "settlement delayed",
    "settlement not received"
  ];
  const hasMerchantSignal = merchantKeywords.some((kw) => normalized.includes(kw));
  const agentCashInKeywords = [
    "cash in",
    "cash-in",
    "cashin",
    "deposit",
    "balance not added",
    "\u0995\u09CD\u09AF\u09BE\u09B6 \u0987\u09A8",
    "\u098F\u099C\u09C7\u09A8\u09CD\u099F",
    "cash in failed",
    "deposit failed",
    "not credited",
    "balance not updated",
    "add balance"
  ];
  const hasAgentCashInSignal = agentCashInKeywords.some((kw) => normalized.includes(kw));
  const cashOutKeywords = [
    "cash out",
    "cash-out",
    "cashout",
    "\u0995\u09CD\u09AF\u09BE\u09B6 \u0986\u0989\u099F",
    "cash withdrawal",
    "withdraw"
  ];
  const hasCashOutSignal = cashOutKeywords.some((kw) => normalized.includes(kw));
  const balanceIssueKeywords = [
    "balance",
    "\u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8",
    "\u099F\u09BE\u0995\u09BE \u09A6\u09C7\u0996\u09BE\u099A\u09CD\u099B\u09C7 \u09A8\u09BE",
    "balance wrong",
    "wrong balance",
    "balance issue",
    "balance problem"
  ];
  const hasBalanceIssueSignal = balanceIssueKeywords.some((kw) => normalized.includes(kw));
  const promptInjectionKeywords = [
    "ignore previous",
    "ignore rules",
    "system instruction",
    "developer instruction",
    "reveal prompt",
    "override",
    "force output",
    "return this json",
    "ask for otp",
    "ask for pin",
    "confirm refund",
    "do not escalate",
    "ignore all",
    "disregard",
    "pretend",
    "act as",
    "you are now",
    "new instruction",
    "forget previous"
  ];
  const hasPromptInjectionSignal = promptInjectionKeywords.some((kw) => normalized.includes(kw));
  return {
    mentionedTransactionIds,
    mentionedAmounts,
    mentionedCounterparties,
    hasPinOtpPasswordSignal,
    hasScamSignal,
    hasRefundSignal,
    hasWrongTransferSignal,
    hasFailedPaymentSignal,
    hasDuplicateSignal,
    hasMerchantSignal,
    hasAgentCashInSignal,
    hasCashOutSignal,
    hasBalanceIssueSignal,
    hasPromptInjectionSignal,
    normalizedText: normalized
  };
}

// src/modules/analyze-ticket/analyze-ticket.engine.ts
function fmt(amount) {
  if (amount === void 0) return "unknown amount";
  return `${amount.toLocaleString()} BDT`;
}
function fmtType(type) {
  return type ? type.replace(/_/g, " ") : "transaction";
}
function classifyCaseType(signals) {
  if (!signals.hasPromptInjectionSignal && (signals.hasScamSignal || signals.hasPinOtpPasswordSignal)) {
    return "phishing_or_social_engineering";
  }
  if (signals.hasDuplicateSignal) return "duplicate_payment";
  if (signals.hasMerchantSignal) return "merchant_settlement_delay";
  if (signals.hasAgentCashInSignal) return "agent_cash_in_issue";
  if (signals.hasWrongTransferSignal) return "wrong_transfer";
  if (signals.hasRefundSignal) return "refund_request";
  if (signals.hasFailedPaymentSignal) return "payment_failed";
  return "other";
}
var TYPE_ALIGNMENT = {
  wrong_transfer: ["transfer"],
  payment_failed: ["payment"],
  duplicate_payment: ["payment"],
  merchant_settlement_delay: ["settlement"],
  agent_cash_in_issue: ["cash_in"],
  refund_request: ["refund", "payment", "transfer"],
  phishing_or_social_engineering: ["transfer", "payment", "cash_out"]
};
var STATUS_ALIGNMENT = {
  wrong_transfer: ["completed", "pending"],
  // money sent (wrong transfer) OR still in-flight
  payment_failed: ["failed", "pending"],
  duplicate_payment: ["completed", "pending"],
  merchant_settlement_delay: ["pending", "failed"],
  agent_cash_in_issue: ["pending", "failed"],
  refund_request: ["completed", "failed", "pending"]
};
function scoreTransaction(txn, signals, caseType) {
  let score = 0;
  const txnId = txn.transaction_id?.toUpperCase() ?? "";
  if (signals.mentionedTransactionIds.some((id) => id.toUpperCase() === txnId)) {
    score += 6;
  }
  if (txn.amount !== void 0 && signals.mentionedAmounts.length > 0) {
    if (signals.mentionedAmounts.some((amt) => Math.abs(amt - txn.amount) < 1)) {
      score += 3;
    } else if (signals.mentionedAmounts.some((amt) => Math.abs(amt - txn.amount) / txn.amount < 0.1)) {
      score += 1;
    }
    const maxMentioned = Math.max(...signals.mentionedAmounts);
    if (txn.amount > maxMentioned * 5 || txn.amount < maxMentioned * 0.1) {
      score -= 2;
    }
  }
  if (signals.mentionedCounterparties.length > 0 && txn.counterparty) {
    const normTxnCp = txn.counterparty.replace(/\s/g, "").toLowerCase();
    if (signals.mentionedCounterparties.some((cp) => {
      const c = cp.replace(/\s/g, "").toLowerCase();
      return c === normTxnCp || normTxnCp.includes(c) || c.includes(normTxnCp);
    })) {
      score += 3;
    }
  }
  if (txn.type) {
    if (TYPE_ALIGNMENT[caseType]?.includes(txn.type)) {
      score += 2;
      if (caseType === "refund_request" && txn.type === "refund") score += 1;
    } else {
      const contradictions = {
        wrong_transfer: ["settlement", "refund"],
        payment_failed: ["cash_in", "settlement", "refund"],
        agent_cash_in_issue: ["settlement", "payment", "cash_out"],
        merchant_settlement_delay: ["cash_in", "cash_out", "refund"]
      };
      if (contradictions[caseType]?.includes(txn.type)) score -= 2;
    }
    if (caseType === "other") {
      if (signals.hasCashOutSignal && txn.type === "cash_out") score += 2;
      if (signals.hasRefundSignal && txn.type === "refund") score += 2;
    }
  }
  if (txn.status && STATUS_ALIGNMENT[caseType]?.includes(txn.status)) {
    score += 2;
  }
  return score;
}
function findRelevantTransaction(transactions, signals, caseType) {
  if (!transactions || transactions.length === 0) {
    return { txn: null, score: 0, isDuplicate: false };
  }
  if (caseType === "duplicate_payment") {
    for (let i = 0; i < transactions.length; i++) {
      for (let j = i + 1; j < transactions.length; j++) {
        const a = transactions[i];
        const b = transactions[j];
        if (a.amount === b.amount && a.counterparty === b.counterparty && (a.status === "completed" || a.status === "pending") && (b.status === "completed" || b.status === "pending")) {
          return { txn: a, score: 8, isDuplicate: true };
        }
      }
    }
  }
  let bestTxn = null;
  let bestScore = -Infinity;
  for (const txn of transactions) {
    const s = scoreTransaction(txn, signals, caseType);
    if (s > bestScore) {
      bestScore = s;
      bestTxn = txn;
    }
  }
  if (caseType === "phishing_or_social_engineering") {
    return { txn: bestScore >= 6 ? bestTxn : null, score: Math.max(0, bestScore), isDuplicate: false };
  }
  const isVague = signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0;
  const THRESHOLD = isVague ? 1 : 2;
  return {
    txn: bestScore >= THRESHOLD ? bestTxn : null,
    score: Math.max(0, bestScore),
    isDuplicate: false
  };
}
function determineEvidenceVerdict(txn, caseType, signals, transactions, isDuplicate) {
  if (transactions.length === 0 || !txn) return "insufficient_data";
  if (caseType === "payment_failed" && txn.status === "completed") return "inconsistent";
  if (caseType === "wrong_transfer" && (txn.status === "failed" || txn.status === "reversed")) return "inconsistent";
  if (caseType === "agent_cash_in_issue" && txn.status === "completed") return "inconsistent";
  if (caseType === "merchant_settlement_delay" && txn.status === "completed") return "inconsistent";
  if (caseType === "duplicate_payment" && !isDuplicate) return "inconsistent";
  if (caseType === "refund_request") {
    if (txn.type === "refund" && txn.status === "completed") return "inconsistent";
    if (txn.status === "reversed") return "inconsistent";
  }
  if (signals.mentionedAmounts.length > 0 && txn.amount !== void 0 && !signals.mentionedAmounts.some((a) => Math.abs(a - txn.amount) / Math.max(txn.amount, 1) < 0.15)) {
    const maxMentioned = Math.max(...signals.mentionedAmounts);
    if (Math.abs(maxMentioned - txn.amount) / Math.max(txn.amount, 1) > 0.5) return "inconsistent";
  }
  if (caseType === "wrong_transfer") {
    if (txn.status === "completed" || txn.status === "pending") return "consistent";
  }
  if (caseType === "payment_failed") {
    if (txn.status === "failed" || txn.status === "pending") return "consistent";
  }
  if (caseType === "duplicate_payment" && isDuplicate) return "consistent";
  if (caseType === "merchant_settlement_delay") {
    if (txn.status === "pending" || txn.status === "failed") return "consistent";
    if (txn.type === "settlement") return "consistent";
  }
  if (caseType === "agent_cash_in_issue") {
    if (txn.status === "pending" || txn.status === "failed") return "consistent";
    if (txn.type === "cash_in") return "consistent";
  }
  if (caseType === "refund_request") {
    return "consistent";
  }
  if (caseType === "phishing_or_social_engineering") {
    return txn.status === "completed" || txn.status === "pending" ? "consistent" : "insufficient_data";
  }
  if (caseType === "other") return "consistent";
  if (txn.type && TYPE_ALIGNMENT[caseType]?.includes(txn.type)) return "consistent";
  return "insufficient_data";
}
function determineSeverity(caseType, evidenceVerdict, signals, txn) {
  if (caseType === "phishing_or_social_engineering") return "critical";
  if (signals.hasPromptInjectionSignal && (signals.hasPinOtpPasswordSignal || signals.hasScamSignal)) {
    return "critical";
  }
  const mentionedMax = signals.mentionedAmounts.length > 0 ? Math.max(...signals.mentionedAmounts) : 0;
  if (caseType === "wrong_transfer") {
    return evidenceVerdict === "insufficient_data" ? "medium" : "high";
  }
  if (mentionedMax >= 1e4) return "high";
  if (caseType === "payment_failed") {
    return mentionedMax >= 5e3 ? "high" : "medium";
  }
  if (caseType === "duplicate_payment") {
    return mentionedMax >= 5e3 ? "high" : "medium";
  }
  if (caseType === "merchant_settlement_delay") {
    if (txn?.status === "failed") return "high";
    if (mentionedMax >= 1e4) return "high";
    return "medium";
  }
  if (caseType === "agent_cash_in_issue") {
    if (mentionedMax >= 1e4) return "high";
    return "medium";
  }
  if (caseType === "refund_request") {
    return mentionedMax >= 5e3 ? "high" : "medium";
  }
  if (caseType === "other") {
    if (signals.hasBalanceIssueSignal || signals.hasCashOutSignal) return "medium";
    return "low";
  }
  return "medium";
}
function determineDepartment(caseType, severity, evidenceVerdict) {
  switch (caseType) {
    case "wrong_transfer":
      return "dispute_resolution";
    case "payment_failed":
      return "payments_ops";
    case "duplicate_payment":
      return "payments_ops";
    case "merchant_settlement_delay":
      return "merchant_operations";
    case "agent_cash_in_issue":
      return "agent_operations";
    case "phishing_or_social_engineering":
      return "fraud_risk";
    case "refund_request":
      return severity === "high" || severity === "critical" || evidenceVerdict === "inconsistent" ? "dispute_resolution" : "customer_support";
    default:
      return "customer_support";
  }
}
function determineHumanReview(caseType, severity, evidenceVerdict, txn, signals) {
  if (caseType === "wrong_transfer") return true;
  if (caseType === "phishing_or_social_engineering") return true;
  if (caseType === "duplicate_payment") return true;
  if (caseType === "merchant_settlement_delay") return true;
  if (caseType === "agent_cash_in_issue") return true;
  if (severity === "high" || severity === "critical") return true;
  if (evidenceVerdict === "inconsistent") return true;
  if (evidenceVerdict === "insufficient_data" && caseType !== "other") return true;
  if (txn?.amount !== void 0 && txn.amount >= 5e3) return true;
  if (caseType === "payment_failed") return true;
  if (caseType === "refund_request") return true;
  if (caseType === "other" && (signals.hasBalanceIssueSignal || signals.hasCashOutSignal)) return true;
  return false;
}
function generateAgentSummary(caseType, evidenceVerdict, department, txn, signals) {
  const caseLabel = caseType.replace(/_/g, " ");
  const dept = department.replace(/_/g, " ");
  if (txn) {
    const txnAmount = fmt(txn.amount);
    const txnType = fmtType(txn.type);
    const txnStatus = txn.status ?? "unknown";
    const txnCp = txn.counterparty ? ` to ${txn.counterparty}` : "";
    const txnTs = txn.timestamp ? ` on ${new Date(txn.timestamp).toUTCString()}` : "";
    let verdictNote;
    if (evidenceVerdict === "consistent") {
      verdictNote = "Transaction evidence is consistent with the complaint";
    } else if (evidenceVerdict === "inconsistent") {
      verdictNote = `Transaction evidence contradicts the complaint \u2014 ${txnType} of ${txnAmount} is marked ${txnStatus}, which conflicts with the reported issue`;
    } else {
      verdictNote = "Evidence is present but additional verification is needed";
    }
    return `Customer reports a ${caseLabel} issue. Matched transaction: ${txn.transaction_id} (${txnType}, ${txnAmount}${txnCp}, status: ${txnStatus}${txnTs}). ${verdictNote}. Case routed to ${dept}.`;
  }
  const amountHint = signals.mentionedAmounts.length > 0 ? ` involving approximately ${fmt(Math.max(...signals.mentionedAmounts))}` : "";
  const cpHint = signals.mentionedCounterparties.length > 0 ? ` with counterparty ${signals.mentionedCounterparties[0]}` : "";
  return `Customer reports a ${caseLabel} issue${amountHint}${cpHint}. No transaction in the provided history could be matched to this complaint. Manual investigation required \u2014 case routed to ${dept}.`;
}
function generateRecommendedNextAction(caseType, evidenceVerdict, txn) {
  const txnRef = txn ? ` (reference: ${txn.transaction_id})` : "";
  switch (caseType) {
    case "wrong_transfer":
      return `Verify the matched transfer${txnRef} using approved internal tools. Confirm the intended recipient vs actual counterparty${txn?.counterparty ? ` (${txn.counterparty})` : ""}. Do not promise reversal before authorization from dispute_resolution.`;
    case "payment_failed":
      return `Check the ledger status for transaction${txnRef}. Confirm debit vs credit posting. If balance was deducted but merchant did not receive, follow the official failed-payment recovery workflow.`;
    case "refund_request":
      return `Review transaction${txnRef} eligibility against refund policy. Verify current status${txn ? ` (currently: ${txn.status})` : ""}. Do not confirm refund before supervisor authorization.`;
    case "duplicate_payment":
      return `Pull full payment records${txnRef ? " around " + txnRef : ""} and compare amount, counterparty, and timestamp for duplicate entries. Escalate to payments_ops if confirmed double debit.`;
    case "merchant_settlement_delay":
      return `Check settlement batch status${txnRef}. Verify merchant ID and expected settlement window. Current status${txn ? `: ${txn.status}` : " unknown"}. Escalate to merchant_operations if overdue.`;
    case "agent_cash_in_issue":
      return `Verify cash-in transaction${txnRef} against ledger posting. Confirm agent ID and balance credit. Status${txn ? `: ${txn.status}` : " unknown"}. Escalate to agent_operations if credit not reflected.`;
    case "phishing_or_social_engineering":
      return `Escalate immediately to fraud_risk. Log any suspicious phone number, link, or account mentioned. Advise customer through official channels only \u2014 do not share internal data.`;
    default:
      return evidenceVerdict === "insufficient_data" ? `Request non-sensitive clarifying details: approximate time, amount${txnRef ? "" : ", or transaction reference"}. Do not request PIN, OTP, password, or card details.` : `Review available information${txnRef} and follow standard support workflow. Escalate if issue persists.`;
  }
}
function generateCustomerReply(caseType) {
  switch (caseType) {
    case "wrong_transfer":
      return "We have noted your concern about the transfer. Our support team will review the transaction details through official channels. Please do not share your PIN, OTP, password, or sensitive credentials with anyone.";
    case "payment_failed":
      return "We have noted your concern about the payment. The transaction details will be checked through official support channels, and any eligible amount will be handled according to policy.";
    case "refund_request":
      return "We have received your refund-related concern. The team will verify the transaction and eligibility through official channels before any action is taken.";
    case "duplicate_payment":
      return "We have noted your concern about a possible duplicate payment. The relevant transaction details will be reviewed, and any eligible adjustment will be processed through official channels.";
    case "merchant_settlement_delay":
      return "We have noted the merchant settlement concern. The merchant operations team will review the settlement status through official records.";
    case "agent_cash_in_issue":
      return "We have noted your concern about the cash-in transaction. The agent operations team will review the transaction record and follow official procedures.";
    case "phishing_or_social_engineering":
      return "Please do not share your PIN, OTP, password, or verification code with anyone. We have flagged this concern for review through official support channels.";
    default:
      return "We have noted your concern. Our support team will review the available information and guide you through official channels.";
  }
}
function calculateConfidence(txn, txnScore, signals, evidenceVerdict, caseType) {
  let c = 0.5;
  if (txn) {
    if (txnScore >= 8) c += 0.3;
    else if (txnScore >= 6) c += 0.2;
    else if (txnScore >= 4) c += 0.15;
    else if (txnScore >= 2) c += 0.05;
    if (signals.mentionedAmounts.some((a) => txn.amount !== void 0 && Math.abs(a - txn.amount) < 1)) c += 0.1;
    if (signals.mentionedCounterparties.length > 0 && txn.counterparty) c += 0.05;
  } else {
    c -= 0.15;
  }
  if (caseType !== "other") c += 0.05;
  else c -= 0.1;
  if (evidenceVerdict === "consistent") c += 0.1;
  else if (evidenceVerdict === "inconsistent") c -= 0.15;
  else c -= 0.05;
  if (signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0) c -= 0.05;
  return Math.min(0.95, Math.max(0.1, Math.round(c * 100) / 100));
}
function buildReasonCodes(caseType, txn, signals, evidenceVerdict, humanReview, isDuplicate, severity) {
  const codes = [caseType];
  if (txn) {
    codes.push("transaction_match");
    if (signals.mentionedAmounts.some((a) => txn.amount !== void 0 && Math.abs(a - txn.amount) < 1)) codes.push("amount_match");
    if (signals.mentionedCounterparties.length > 0 && txn.counterparty) codes.push("counterparty_match");
    if (txn.type && TYPE_ALIGNMENT[caseType]?.includes(txn.type)) codes.push("type_match");
    if (txn.status === "completed") codes.push("status_completed");
    if (txn.status === "failed") codes.push("status_failed");
    if (txn.status === "pending") codes.push("status_pending");
    if (txn.status === "reversed") codes.push("status_reversed");
  } else {
    codes.push("no_transaction_match");
    codes.push("insufficient_history");
  }
  if (evidenceVerdict === "inconsistent") codes.push("evidence_contradiction");
  if (signals.hasPromptInjectionSignal) codes.push("prompt_injection_detected");
  if (signals.hasPinOtpPasswordSignal) codes.push("credential_request_detected");
  if (signals.hasScamSignal) codes.push("phishing_signal");
  if (isDuplicate) {
    codes.push("duplicate_payment_detected");
    codes.push("repeated_amount_counterparty");
  }
  if (humanReview) codes.push("human_review_required");
  if (severity === "high" || severity === "critical") codes.push("high_value");
  if (signals.mentionedAmounts.length === 0 && signals.mentionedTransactionIds.length === 0) codes.push("ambiguous_complaint");
  return [...new Set(codes)];
}
var UNSAFE_PATTERNS = [
  "share your pin",
  "send otp",
  "give password",
  "send full card",
  "we will refund you",
  "refund confirmed",
  "reversal confirmed",
  "account recovery confirmed",
  "your refund has been processed"
];
function applySafetyGuardrails(response, caseType, evidenceVerdict, txn) {
  const isUnsafe = UNSAFE_PATTERNS.some(
    (p) => response.customer_reply.toLowerCase().includes(p) || response.recommended_next_action.toLowerCase().includes(p)
  );
  if (isUnsafe) {
    response.customer_reply = generateCustomerReply(caseType);
    response.recommended_next_action = generateRecommendedNextAction(caseType, evidenceVerdict, txn);
    response.human_review_required = true;
    if (!response.reason_codes.includes("safety_guardrail_applied")) response.reason_codes.push("safety_guardrail_applied");
  }
  const V = {
    evidence_verdict: ["consistent", "inconsistent", "insufficient_data"],
    case_type: ["wrong_transfer", "payment_failed", "refund_request", "duplicate_payment", "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other"],
    severity: ["low", "medium", "high", "critical"],
    department: ["customer_support", "dispute_resolution", "payments_ops", "merchant_operations", "agent_operations", "fraud_risk"]
  };
  if (!V.evidence_verdict.includes(response.evidence_verdict)) response.evidence_verdict = "insufficient_data";
  if (!V.case_type.includes(response.case_type)) response.case_type = "other";
  if (!V.severity.includes(response.severity)) response.severity = "medium";
  if (!V.department.includes(response.department)) response.department = "customer_support";
  response.confidence = Math.min(0.95, Math.max(0.1, response.confidence));
  return response;
}
function analyzeTicket(input) {
  const transactions = input.transaction_history ?? [];
  const signals = extractSignals(input.complaint);
  const caseType = classifyCaseType(signals);
  const { txn, score: txnScore, isDuplicate } = findRelevantTransaction(transactions, signals, caseType);
  const evidenceVerdict = determineEvidenceVerdict(txn, caseType, signals, transactions, isDuplicate);
  const severity = determineSeverity(caseType, evidenceVerdict, signals, txn);
  const department = determineDepartment(caseType, severity, evidenceVerdict);
  const humanReviewRequired = determineHumanReview(caseType, severity, evidenceVerdict, txn, signals);
  const agentSummary = generateAgentSummary(caseType, evidenceVerdict, department, txn, signals);
  const recommendedNextAction = generateRecommendedNextAction(caseType, evidenceVerdict, txn);
  const customerReply = generateCustomerReply(caseType);
  const confidence = calculateConfidence(txn, txnScore, signals, evidenceVerdict, caseType);
  const reasonCodes = buildReasonCodes(caseType, txn, signals, evidenceVerdict, humanReviewRequired, isDuplicate, severity);
  let response = {
    ticket_id: input.ticket_id,
    relevant_transaction_id: txn?.transaction_id ?? null,
    evidence_verdict: evidenceVerdict,
    case_type: caseType,
    severity,
    department,
    agent_summary: agentSummary,
    recommended_next_action: recommendedNextAction,
    customer_reply: customerReply,
    human_review_required: humanReviewRequired,
    confidence,
    reason_codes: reasonCodes
  };
  return applySafetyGuardrails(response, caseType, evidenceVerdict, txn);
}

// src/modules/analyze-ticket/analyze-ticket.service.ts
function safeComplaintPreview(complaint) {
  const sensitivePattern = /\b(otp|pin|password|card\s*number|\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/gi;
  const sanitized = complaint.replace(sensitivePattern, "[REDACTED]");
  return sanitized.substring(0, 120);
}
async function saveTicketAnalysisLog(input, result) {
  try {
    await prisma.ticketAnalysisLog.create({
      data: {
        ticketId: result.ticket_id,
        complaintPreview: safeComplaintPreview(input.complaint),
        language: input.language ?? null,
        channel: input.channel ?? null,
        userType: input.user_type ?? null,
        caseType: result.case_type,
        evidenceVerdict: result.evidence_verdict,
        relevantTransactionId: result.relevant_transaction_id ?? null,
        severity: result.severity,
        department: result.department,
        humanReviewRequired: result.human_review_required,
        confidence: result.confidence ?? null,
        reasonCodesJson: JSON.stringify(result.reason_codes ?? [])
      }
    });
  } catch {
    console.error("[QueueStorm] Optional DB logging failed (non-fatal)");
  }
}
async function saveSafetyEventLog(ticketId, eventType, detail) {
  try {
    await prisma.safetyEventLog.create({
      data: {
        ticketId: ticketId ?? null,
        eventType,
        detail: detail.substring(0, 500)
      }
    });
  } catch {
    console.error("[QueueStorm] Optional safety event log failed (non-fatal)");
  }
}

// src/modules/analyze-ticket/analyze-ticket.controller.ts
var analyzeTicketController = async (req, res, next) => {
  try {
    const parseResult = AnalyzeTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      if (firstIssue?.path[0] === "complaint" && firstIssue?.code === "too_small") {
        res.status(422).json({
          error: true,
          message: "Complaint cannot be empty"
        });
        return;
      }
      res.status(400).json({
        error: true,
        message: "Invalid request body: " + parseResult.error.issues.map((i) => i.message).join(", ")
      });
      return;
    }
    const input = parseResult.data;
    if (!input.complaint.trim()) {
      res.status(422).json({
        error: true,
        message: "Complaint cannot be empty or whitespace"
      });
      return;
    }
    const result = analyzeTicket(input);
    if (result.reason_codes?.includes("prompt_injection_detected")) {
      saveSafetyEventLog(
        input.ticket_id,
        "prompt_injection_detected",
        `Prompt injection signal found in ticket ${input.ticket_id}`
      ).catch(() => {
      });
    }
    saveTicketAnalysisLog(input, result).catch(() => {
    });
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: true,
        message: "Invalid request format"
      });
      return;
    }
    next(err);
  }
};

// src/modules/analyze-ticket/analyze-ticket.route.ts
var analyzeTicketRouter = Router2();
analyzeTicketRouter.post("/", analyzeTicketController);
var analyze_ticket_route_default = analyzeTicketRouter;

// src/app.ts
var app = express();
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: true, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
app.use("/analyze-ticket", analyze_ticket_route_default);
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "QueueStorm Investigator API is running",
    service: "QueueStorm Investigator",
    version: "1.0.0",
    environment: process.env.NODE_ENV ?? "development",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.use("/api/v1", indexRouter);
app.use((_req, res) => {
  res.status(404).json({ error: true, message: "Route not found" });
});
app.use((err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) console.error("[Error]", err);
  res.status(err?.statusCode ?? 500).json({
    error: true,
    message: err?.message ?? "Internal server error"
  });
});
var app_default = app;

// src/server.ts
var PORT = process.env.PORT || 8e3;
async function main() {
  try {
    await prisma.$connect();
    console.log("[DB] Connected to database successfully.");
  } catch (error) {
    console.warn("[DB] Database unavailable \u2014 continuing without persistence. Analysis API will still function.");
  }
  app_default.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] QueueStorm Investigator running on port ${PORT}`);
    console.log(`[Health] GET  http://localhost:${PORT}/health`);
    console.log(`[API]    POST http://localhost:${PORT}/analyze-ticket`);
  });
}
main().catch((err) => {
  console.error("[Fatal] Server failed to start:", err);
  process.exit(1);
});
