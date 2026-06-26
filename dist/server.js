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
  transaction_history: z.array(TransactionEntrySchema).optional().default(() => []),
  metadata: z.record(z.string(), z.unknown()).optional().default(() => ({}))
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
    const num = parseFloat((amountMatch[1] ?? "").replace(/,/g, ""));
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
  const buyersRemorseKeywords = [
    "changed my mind",
    "don't want",
    "do not want",
    "no longer want",
    "want to cancel",
    "cancel my order",
    "cancel order",
    "cancelled order",
    "i don't need",
    "i do not need",
    "decided not to",
    "won't buy",
    "\u09AE\u09A8 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8",
    "\u0986\u09B0 \u099A\u09BE\u0987 \u09A8\u09BE",
    "\u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09A4\u09C7 \u099A\u09BE\u0987",
    "\u0995\u09BF\u09A8\u09AC \u09A8\u09BE"
  ];
  const hasBuyersRemorseSignal = buyersRemorseKeywords.some((kw) => normalized.includes(kw));
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
    hasBuyersRemorseSignal,
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
function detectMultiTransactionAnomalies(transactions, caseType) {
  if (!transactions || transactions.length < 2) {
    return { type: "none", transactions: [], description: "" };
  }
  const transfers = transactions.filter((t) => t.type === "transfer" || t.type === "payment");
  if (transfers.length >= 2) {
    const byAmount = /* @__PURE__ */ new Map();
    for (const t of transfers) {
      if (t.amount === void 0) continue;
      const existing = byAmount.get(t.amount) ?? [];
      existing.push(t);
      byAmount.set(t.amount, existing);
    }
    for (const [, group] of byAmount) {
      if (group.length >= 2) {
        const counterparties = [...new Set(group.map((t) => t.counterparty).filter(Boolean))];
        if (counterparties.length >= 2) {
          return {
            type: "multiple_same_amount_different_recipients",
            transactions: group,
            description: `Found ${group.length} transfers of ${fmt(group[0]?.amount)} to ${counterparties.length} different recipients: ${counterparties.join(", ")}. This pattern suggests a possible wrong transfer or unintended duplicate.`
          };
        }
      }
    }
  }
  const completedTransfers = transfers.filter((t) => t.status === "completed");
  const failedTransfers = transfers.filter((t) => t.status === "failed");
  for (const failed of failedTransfers) {
    const matchingCompleted = completedTransfers.find(
      (c) => c.counterparty === failed.counterparty && Math.abs((c.amount ?? 0) - (failed.amount ?? 0)) < 1
    );
    if (matchingCompleted) {
      return {
        type: "failed_after_completed",
        transactions: [matchingCompleted, failed],
        description: `A transfer of ${fmt(failed.amount)} to ${failed.counterparty} was completed (${matchingCompleted.transaction_id}) but a subsequent retry (${failed.transaction_id}) failed. The original transfer likely went through \u2014 the failed retry may have caused confusion.`
      };
    }
  }
  return { type: "none", transactions: [], description: "" };
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
function generateAgentSummary(caseType, evidenceVerdict, department, txn, signals, transactions, anomaly, isBuyersRemorse) {
  const caseLabel = caseType.replace(/_/g, " ");
  const dept = department.replace(/_/g, " ");
  if (anomaly.type !== "none" && anomaly.transactions.length > 0) {
    const txnList = anomaly.transactions.map((t) => `${t.transaction_id} (${fmtType(t.type)}, ${fmt(t.amount ?? 0)} \u2192 ${t.counterparty ?? "unknown"}, ${t.status})`).join(" | ");
    return `Customer reports a ${caseLabel} issue. ANOMALY DETECTED \u2014 ${anomaly.description} Affected transactions: [${txnList}]. Evidence verdict: ${evidenceVerdict}. Manual investigation required \u2014 case routed to ${dept}.`;
  }
  if (isBuyersRemorse && caseType === "refund_request" && txn) {
    return `Customer requests a refund of ${fmt(txn.amount)} for transaction ${txn.transaction_id} (${fmtType(txn.type)} to ${txn.counterparty ?? "merchant"}, status: ${txn.status ?? "unknown"}). BUYER'S REMORSE DETECTED \u2014 customer explicitly states they changed their mind / no longer want the product. This is a voluntary cancellation, not a system failure. Platform refund policy likely does not apply. Agent should advise customer to contact the merchant directly. Case routed to ${dept}.`;
  }
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
  if (caseType === "other" && transactions.length > 0) {
    const recentTxns = transactions.slice(-3).map((t) => `${t.transaction_id} (${fmtType(t.type)}, ${fmt(t.amount)}, ${t.status})`).join("; ");
    const amountHint2 = signals.mentionedAmounts.length > 0 ? ` Customer mentioned approximately ${fmt(Math.max(...signals.mentionedAmounts))}.` : "";
    return `Customer reports an unspecified financial concern.${amountHint2} No specific keywords matched a known case type. Recent account activity on file: [${recentTxns}]. Agent should review these transactions with the customer and probe for the exact issue. Case routed to ${dept}.`;
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
function fmtCp(cp) {
  if (!cp) return "the recipient";
  if (cp.startsWith("+88") || cp.startsWith("01")) return `the number ${cp}`;
  if (cp.toUpperCase().startsWith("MERCHANT")) return `merchant ${cp}`;
  if (cp.toUpperCase().startsWith("AGENT")) return `agent ${cp}`;
  return cp;
}
function generateCustomerReply(caseType, language = "en", ctx = {}) {
  const { txnId, amount, counterparty, isBuyersRemorse, evidenceVerdict, anomaly } = ctx;
  const txnRef = txnId ? ` (${txnId})` : "";
  const amtFmt = amount ? fmt(amount) : null;
  const cpFmt = fmtCp(counterparty);
  const amtSent = amtFmt ? `${amtFmt}` : "the amount";
  const isInconsistent = evidenceVerdict === "inconsistent";
  if (language === "en") {
    switch (caseType) {
      case "wrong_transfer": {
        const opening = amtFmt ? `We can see a transfer of ${amtFmt} was sent${counterparty ? ` to ${cpFmt}` : ""}${txnRef}.` : `We've received your report${txnRef} about the transfer.`;
        const status = isInconsistent ? `Our records currently show the transfer did not go through, but we're checking further to be sure.` : `Our records show the transfer was processed \u2014 our Dispute Resolution team will now investigate to confirm where the funds landed.`;
        return `Hi there! We're really sorry to hear about this \u2014 we completely understand how stressful this must be. ${opening} ${status} We'll keep you posted every step of the way and do everything possible to help. Please remember \u2014 our team will never ask for your PIN, OTP, or password. Don't share these with anyone.`;
      }
      case "payment_failed": {
        const opening = amtFmt ? `We can see a payment of ${amtFmt}${counterparty ? ` to ${cpFmt}` : ""}${txnRef} in your account.` : `We've received your report${txnRef} about the payment.`;
        const status = isInconsistent ? `Interestingly, our records indicate the payment may have gone through on our end \u2014 but we'll investigate further to make sure the full picture is clear.` : `The transaction appears to have encountered an issue on our end, and our Payments team is already on it.`;
        return `We're really sorry to hear your payment didn't go through as expected. ${opening} ${status} If any amount was deducted and the service wasn't delivered, rest assured it will be handled according to our policy. We'll get back to you very soon. Please don't share your PIN or OTP with anyone.`;
      }
      case "refund_request": {
        if (isBuyersRemorse) {
          const merchantLine = counterparty ? `to ${cpFmt}` : `to the merchant`;
          return `Thank you for reaching out! We appreciate your honesty \u2014 we understand that sometimes plans change. However, we'd like to let you know that your payment of ${amtSent} ${merchantLine}${txnRef} was successfully completed, which means the funds have already been transferred to them. Unfortunately, our platform policy does not allow reversals based on a change of mind, since the merchant has already received the payment. We'd recommend reaching out directly to the merchant \u2014 they may be able to offer a refund or exchange. If you believe there was a technical error with the transaction itself, please let us know and we'll gladly look into it.`;
        }
        const opening = amtFmt ? `We've received your refund request for ${amtFmt}${counterparty ? ` paid to ${cpFmt}` : ""}${txnRef}.` : `We've received your refund request${txnRef}.`;
        return `${opening} We truly understand how important this is for you, and we're treating it with priority. Our team is reviewing the transaction details right now and will verify eligibility as quickly as possible. Refund decisions are subject to our official policy and may require a brief verification window. We appreciate your patience \u2014 we'll keep you updated. Please do not share your PIN or OTP with anyone.`;
      }
      case "duplicate_payment": {
        const opening = amtFmt ? `We can see a payment of ${amtFmt}${counterparty ? ` to ${cpFmt}` : ""}${txnRef} in your records.` : `We've received your report${txnRef} about the possible duplicate.`;
        return `We completely understand how worrying a double charge can be \u2014 and we want to sort this out for you right away! ${opening} Our Payments team will now carefully review all relevant records to confirm whether a duplicate deduction actually occurred. If a double charge is confirmed, it will be corrected through our official process. We'll update you as soon as we have a finding.`;
      }
      case "merchant_settlement_delay": {
        const opening = amtFmt ? `We've noted your concern about the delayed settlement of ${amtFmt}${txnRef}.` : `We've noted your settlement concern${txnRef}.`;
        return `We're sorry for the inconvenience \u2014 we know how critical timely settlements are for your business. ${opening} Our Merchant Operations team will review the settlement batch status immediately and follow up through official channels. We appreciate your patience and will get back to you as soon as possible.`;
      }
      case "agent_cash_in_issue": {
        const opening = amtFmt ? `We can see a cash-in of ${amtFmt}${counterparty ? ` via ${cpFmt}` : ""}${txnRef} in your history.` : `We've received your cash-in report${txnRef}.`;
        return `We're sorry your balance hasn't updated yet \u2014 that's definitely frustrating and we understand your concern. ${opening} Our Agent Operations team will verify the transaction against our ledger right away. If there's any discrepancy, we'll follow the proper procedure to get it credited to your account. We'll be in touch shortly.`;
      }
      case "phishing_or_social_engineering":
        return `Thank you for reporting this immediately \u2014 you absolutely did the right thing. We want to be very clear: our team will NEVER ask for your PIN, OTP, password, or any verification code \u2014 not through calls, messages, or any channel. Please do NOT share these details with anyone, even if they claim to be from our support team. We've flagged this incident for our Fraud & Risk team to investigate urgently. If you think your account may have been accessed without your permission, please change your PIN right now through the app.`;
      default: {
        if (anomaly && anomaly.type === "multiple_same_amount_different_recipients") {
          const txnCount = anomaly.transactions.length;
          const amountMentioned = anomaly.transactions[0]?.amount;
          const uniqueCps = [...new Set(anomaly.transactions.map((t) => t.counterparty).filter(Boolean))];
          return `Thank you for getting in touch \u2014 we understand something doesn't feel right about your account activity, and we take that very seriously. Looking at your recent history, we can see ${txnCount} transfer${txnCount > 1 ? "s" : ""} of ${amountMentioned ? fmt(amountMentioned) : "the same amount"} going to ${uniqueCps.length > 1 ? `${uniqueCps.length} different recipients (${uniqueCps.join(", ")})` : "the same recipient"}, which looks unusual. Our support team will review this carefully and get back to you with a clear explanation of what happened and what the next steps are. Please do not share your PIN or OTP with anyone while we investigate.`;
        }
        if (anomaly && anomaly.type === "failed_after_completed") {
          const completedTxn = anomaly.transactions[0];
          const failedTxn = anomaly.transactions[1];
          return `Thank you for reaching out \u2014 we can see why this is confusing. Looking at your transaction history, it appears a transfer${completedTxn?.amount ? ` of ${fmt(completedTxn.amount)}` : ""} to ${fmtCp(completedTxn?.counterparty)} was successfully completed${completedTxn?.transaction_id ? ` (${completedTxn.transaction_id})` : ""}, but a follow-up attempt${failedTxn?.transaction_id ? ` (${failedTxn.transaction_id})` : ""} did not go through. This may be why the recipient appears not to have received the money \u2014 the original transfer likely did go through. Our team will investigate and confirm the exact status. Please do not share your PIN or OTP with anyone.`;
        }
        return `Thank you for reaching out to us! We understand you have a concern about your account and we genuinely want to help. To make sure we look into the right transaction, could you share a bit more detail \u2014 such as the approximate date, the amount involved, or who you sent it to? This will help our team investigate much faster. In the meantime, please do not share your PIN or OTP with anyone.`;
      }
    }
  }
  if (language === "bn") {
    switch (caseType) {
      case "wrong_transfer": {
        const opening = amtFmt ? `\u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF ${amtFmt} \u098F\u09B0 \u098F\u0995\u099F\u09BF \u099F\u09CD\u09B0\u09BE\u09A8\u09CD\u09B8\u09AB\u09BE\u09B0${counterparty ? ` ${cpFmt}-\u098F` : ""} \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7${txnRef}\u0964` : `\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09AD\u09BF\u09AF\u09CB\u0997${txnRef} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09BE\u099B\u09C7 \u09AA\u09CC\u0981\u099B\u09C7\u099B\u09C7\u0964`;
        return `\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09AD\u09BF\u09AF\u09CB\u0997 \u09AA\u09C7\u09AF\u09BC\u09C7 \u0986\u09AE\u09B0\u09BE \u09B8\u09A4\u09CD\u09AF\u09BF\u0987 \u09A6\u09C1\u0983\u0996\u09BF\u09A4 \u2014 \u098F\u0987 \u09AA\u09B0\u09BF\u09B8\u09CD\u09A5\u09BF\u09A4\u09BF \u0995\u09A4\u099F\u09BE \u0989\u09A6\u09CD\u09AC\u09C7\u0997\u099C\u09A8\u0995 \u09A4\u09BE \u0986\u09AE\u09B0\u09BE \u09AC\u09C1\u099D\u09A4\u09C7 \u09AA\u09BE\u09B0\u099B\u09BF\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A1\u09BF\u09B8\u09AA\u09BF\u0989\u099F \u09B0\u09C7\u099C\u09CB\u09B2\u09BF\u0989\u09B6\u09A8 \u09A6\u09B2 \u098F\u099F\u09BF \u0985\u0997\u09CD\u09B0\u09BE\u09A7\u09BF\u0995\u09BE\u09B0\u09C7\u09B0 \u09AD\u09BF\u09A4\u09CD\u09A4\u09BF\u09A4\u09C7 \u09A4\u09A6\u09A8\u09CD\u09A4 \u0995\u09B0\u09AC\u09C7\u0964 \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF \u09AA\u09A6\u0995\u09CD\u09B7\u09C7\u09AA\u09C7 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0986\u09AA\u09A1\u09C7\u099F \u099C\u09BE\u09A8\u09BE\u09A8\u09CB \u09B9\u09AC\u09C7\u0964 \u09AE\u09A8\u09C7 \u09B0\u09BE\u0996\u09AC\u09C7\u09A8, \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09CB\u09A8\u09CB \u09AA\u09CD\u09B0\u09A4\u09BF\u09A8\u09BF\u09A7\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09BF\u09A8, \u0993\u099F\u09BF\u09AA\u09BF \u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u099A\u09BE\u0987\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
      }
      case "payment_failed": {
        const opening = amtFmt ? `\u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF ${amtFmt} \u098F\u09B0 \u098F\u0995\u099F\u09BF \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F${txnRef} \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE\u0995\u09B0\u09A3\u09C7\u09B0 \u09B8\u09AE\u09AF\u09BC \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964` : `\u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u0985\u09AD\u09BF\u09AF\u09CB\u0997${txnRef} \u0986\u09AE\u09B0\u09BE \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
        return `\u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u09AB\u09B2 \u09A8\u09BE \u09B9\u0993\u09AF\u09BC\u09BE\u09AF\u09BC \u0986\u09AE\u09B0\u09BE \u0986\u09A8\u09CD\u09A4\u09B0\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u09A6\u09C1\u0983\u0996\u09BF\u09A4\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u09B8 \u09A6\u09B2 \u098F\u099F\u09BF \u098F\u0996\u09A8\u0987 \u09AA\u09B0\u09CD\u09AF\u09BE\u09B2\u09CB\u099A\u09A8\u09BE \u0995\u09B0\u099B\u09C7\u09A8\u0964 \u09AF\u09A6\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09A5\u09C7\u0995\u09C7 \u099F\u09BE\u0995\u09BE \u0995\u09BE\u099F\u09BE \u09B9\u09AF\u09BC\u09C7 \u09A5\u09BE\u0995\u09C7, \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A8\u09C0\u09A4\u09BF\u09AE\u09BE\u09B2\u09BE \u0985\u09A8\u09C1\u09AF\u09BE\u09AF\u09BC\u09C0 \u09A4\u09BE \u09B8\u09AE\u09BE\u09A7\u09BE\u09A8 \u0995\u09B0\u09BE \u09B9\u09AC\u09C7\u0964 \u09B6\u09C0\u0998\u09CD\u09B0\u0987 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0986\u09AA\u09A1\u09C7\u099F \u099C\u09BE\u09A8\u09BE\u09A8\u09CB \u09B9\u09AC\u09C7\u0964 \u09AA\u09BF\u09A8 \u09AC\u09BE \u0993\u099F\u09BF\u09AA\u09BF \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
      }
      case "refund_request": {
        if (isBuyersRemorse) {
          return `\u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964 \u0986\u09AE\u09B0\u09BE \u09AC\u09C1\u099D\u09A4\u09C7 \u09AA\u09BE\u09B0\u099B\u09BF \u0995\u0996\u09A8\u09CB \u0995\u0996\u09A8\u09CB \u09AE\u09A8 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u09B9\u09AF\u09BC\u0964 \u09A4\u09AC\u09C7 \u099C\u09BE\u09A8\u09BE\u09A4\u09C7 \u099A\u09BE\u0987, ${amtFmt ? `${amtFmt} \u098F\u09B0` : "\u098F\u0987"} \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u099F\u09BF${counterparty ? ` ${cpFmt}-\u0995\u09C7` : " \u09AE\u09BE\u09B0\u09CD\u099A\u09C7\u09A8\u09CD\u099F\u0995\u09C7"} \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09AF\u09BC\u09C7 \u0997\u09C7\u099B\u09C7${txnRef}\u0964 \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u09AE\u09A8 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8\u09C7\u09B0 \u0995\u09BE\u09B0\u09A3\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u099F\u09AB\u09B0\u09CD\u09AE\u09C7\u09B0 \u09AA\u0995\u09CD\u09B7\u09C7 \u098F\u0987 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09BE \u09B8\u09AE\u09CD\u09AD\u09AC \u09A8\u09AF\u09BC\u0964 \u09AE\u09BE\u09B0\u09CD\u099A\u09C7\u09A8\u09CD\u099F\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09B2\u09C7 \u09A4\u09BE\u09B0\u09BE \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u09A8\u0964 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7 \u0995\u09CB\u09A8\u09CB \u09AA\u09CD\u09B0\u09AF\u09C1\u0995\u09CD\u09A4\u09BF\u0997\u09A4 \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE \u09A5\u09BE\u0995\u09B2\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u099C\u09BE\u09A8\u09BE\u09A8\u0964`;
        }
        const opening = amtFmt ? `${amtFmt} \u098F\u09B0 \u09B0\u09BF\u09AB\u09BE\u09A8\u09CD\u09A1 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7${txnRef} \u0986\u09AE\u09B0\u09BE \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964` : `\u0986\u09AA\u09A8\u09BE\u09B0 \u09B0\u09BF\u09AB\u09BE\u09A8\u09CD\u09A1 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7${txnRef} \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
        return `${opening} \u098F\u099F\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0995\u09A4\u099F\u09BE \u0997\u09C1\u09B0\u09C1\u09A4\u09CD\u09AC\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A4\u09BE \u0986\u09AE\u09B0\u09BE \u09AC\u09C1\u099D\u09BF \u098F\u09AC\u0982 \u098F\u099F\u09BF\u0995\u09C7 \u0985\u0997\u09CD\u09B0\u09BE\u09A7\u09BF\u0995\u09BE\u09B0 \u09A6\u09BF\u099A\u09CD\u099B\u09BF\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A6\u09B2 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u09AC\u09BF\u09AC\u09B0\u09A3 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C7 \u09AF\u09A4 \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B8\u09AE\u09CD\u09AD\u09AC \u09B8\u09BF\u09A6\u09CD\u09A7\u09BE\u09A8\u09CD\u09A4 \u09A8\u09C7\u09AC\u09C7\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u09A7\u09C8\u09B0\u09CD\u09AF\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6 \u2014 \u0986\u09AE\u09B0\u09BE \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF \u0986\u09AA\u09A1\u09C7\u099F \u099C\u09BE\u09A8\u09BE\u09AC\u0964 \u09AA\u09BF\u09A8 \u09AC\u09BE \u0993\u099F\u09BF\u09AA\u09BF \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
      }
      case "duplicate_payment": {
        const opening = amtFmt ? `\u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF ${amtFmt} \u098F\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u099F\u09BF${txnRef} \u09A8\u09BF\u09AF\u09BC\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0989\u09A6\u09CD\u09AC\u09C7\u0997 \u09B0\u09AF\u09BC\u09C7\u099B\u09C7\u0964` : `\u09A6\u09C1\u0987\u09AC\u09BE\u09B0 \u099A\u09BE\u09B0\u09CD\u099C \u09B9\u0993\u09AF\u09BC\u09BE\u09B0 \u0985\u09AD\u09BF\u09AF\u09CB\u0997${txnRef} \u0986\u09AE\u09B0\u09BE \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
        return `\u09A6\u09C1\u0987\u09AC\u09BE\u09B0 \u099A\u09BE\u09B0\u09CD\u099C \u09B9\u0993\u09AF\u09BC\u09BE\u09B0 \u09AC\u09BF\u09B7\u09AF\u09BC\u099F\u09BF \u09B8\u09A4\u09CD\u09AF\u09BF\u0987 \u0989\u09A6\u09CD\u09AC\u09C7\u0997\u099C\u09A8\u0995 \u2014 \u098F\u099F\u09BF \u09AC\u09C1\u099D\u09A4\u09C7 \u09AA\u09BE\u09B0\u099B\u09BF\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AA\u09C7\u09AE\u09C7\u09A8\u09CD\u099F\u09B8 \u09A6\u09B2 \u09B8\u09AE\u09B8\u09CD\u09A4 \u09AA\u09CD\u09B0\u09BE\u09B8\u0999\u09CD\u0997\u09BF\u0995 \u09B0\u09C7\u0995\u09B0\u09CD\u09A1 \u09AA\u09B0\u09CD\u09AF\u09BE\u09B2\u09CB\u099A\u09A8\u09BE \u0995\u09B0\u09AC\u09C7\u09A8\u0964 \u09A1\u09C1\u09AA\u09CD\u09B2\u09BF\u0995\u09C7\u099F \u099A\u09BE\u09B0\u09CD\u099C \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u09B9\u09B2\u09C7 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8\u09C0\u09AF\u09BC \u09AC\u09CD\u09AF\u09AC\u09B8\u09CD\u09A5\u09BE \u09A8\u09C7\u0993\u09AF\u09BC\u09BE \u09B9\u09AC\u09C7\u0964 \u09B6\u09C0\u0998\u09CD\u09B0\u0987 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0986\u09AA\u09A1\u09C7\u099F \u099C\u09BE\u09A8\u09BE\u09AC\u0964`;
      }
      case "merchant_settlement_delay": {
        const opening = amtFmt ? `${amtFmt} \u098F\u09B0 \u09B8\u09C7\u099F\u09C7\u09B2\u09AE\u09C7\u09A8\u09CD\u099F${txnRef} \u09AC\u09BF\u09B2\u09AE\u09CD\u09AC\u09BF\u09A4 \u09B9\u0993\u09AF\u09BC\u09BE\u09B0 \u09AC\u09BF\u09B7\u09AF\u09BC\u099F\u09BF \u0986\u09AE\u09B0\u09BE \u09A8\u09A5\u09BF\u09AD\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09C7\u099B\u09BF\u0964` : `\u09AE\u09BE\u09B0\u09CD\u099A\u09C7\u09A8\u09CD\u099F \u09B8\u09C7\u099F\u09C7\u09B2\u09AE\u09C7\u09A8\u09CD\u099F \u09B8\u0982\u0995\u09CD\u09B0\u09BE\u09A8\u09CD\u09A4 \u0985\u09AD\u09BF\u09AF\u09CB\u0997${txnRef} \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
        return `\u09B8\u09C7\u099F\u09C7\u09B2\u09AE\u09C7\u09A8\u09CD\u099F\u09C7 \u09A6\u09C7\u09B0\u09BF\u09B0 \u099C\u09A8\u09CD\u09AF \u0986\u09AE\u09B0\u09BE \u09A6\u09C1\u0983\u0996\u09BF\u09A4 \u2014 \u09AC\u09CD\u09AF\u09AC\u09B8\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09B8\u09AE\u09AF\u09BC\u09AE\u09A4\u09CB \u09B8\u09C7\u099F\u09C7\u09B2\u09AE\u09C7\u09A8\u09CD\u099F \u0995\u09A4\u099F\u09BE \u099C\u09B0\u09C1\u09B0\u09BF \u09A4\u09BE \u0986\u09AE\u09B0\u09BE \u099C\u09BE\u09A8\u09BF\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AE\u09BE\u09B0\u09CD\u099A\u09C7\u09A8\u09CD\u099F \u0985\u09AA\u09BE\u09B0\u09C7\u09B6\u09A8\u09B8 \u09A6\u09B2 \u098F\u099F\u09BF \u098F\u0996\u09A8\u0987 \u09AA\u09B0\u09CD\u09AF\u09BE\u09B2\u09CB\u099A\u09A8\u09BE \u0995\u09B0\u09AC\u09C7\u09A8\u0964 \u09A6\u09CD\u09B0\u09C1\u09A4 \u0986\u09AA\u09A1\u09C7\u099F \u09A6\u09C7\u0993\u09AF\u09BC\u09BE \u09B9\u09AC\u09C7\u0964`;
      }
      case "agent_cash_in_issue": {
        const opening = amtFmt ? `\u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF ${amtFmt} \u098F\u09B0 \u0995\u09CD\u09AF\u09BE\u09B6 \u0987\u09A8${counterparty ? ` (${cpFmt})` : ""}${txnRef} \u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8\u09C7 \u09AF\u09CB\u0997 \u09B9\u09AF\u09BC\u09A8\u09BF\u0964` : `\u0995\u09CD\u09AF\u09BE\u09B6 \u0987\u09A8 \u09B8\u0982\u0995\u09CD\u09B0\u09BE\u09A8\u09CD\u09A4 \u0985\u09AD\u09BF\u09AF\u09CB\u0997${txnRef} \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
        return `\u09AC\u09CD\u09AF\u09BE\u09B2\u09C7\u09A8\u09CD\u09B8 \u0986\u09AA\u09A1\u09C7\u099F \u09A8\u09BE \u09B9\u0993\u09AF\u09BC\u09BE\u099F\u09BE \u09B8\u09A4\u09CD\u09AF\u09BF\u0987 \u09AC\u09BF\u09B0\u0995\u09CD\u09A4\u09BF\u0995\u09B0 \u2014 \u098F\u099C\u09A8\u09CD\u09AF \u0986\u09AE\u09B0\u09BE \u0986\u09A8\u09CD\u09A4\u09B0\u09BF\u0995\u09AD\u09BE\u09AC\u09C7 \u09A6\u09C1\u0983\u0996\u09BF\u09A4\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u098F\u099C\u09C7\u09A8\u09CD\u099F \u0985\u09AA\u09BE\u09B0\u09C7\u09B6\u09A8\u09B8 \u09A6\u09B2 \u09B2\u09C7\u099C\u09BE\u09B0\u09C7\u09B0 \u09AC\u09BF\u09AA\u09B0\u09C0\u09A4\u09C7 \u098F\u099F\u09BF \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09AC\u09C7\u09A8 \u098F\u09AC\u0982 \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B8\u09AE\u09BE\u09A7\u09BE\u09A8 \u0995\u09B0\u09AC\u09C7\u09A8\u0964 \u09B6\u09C0\u0998\u09CD\u09B0\u0987 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09BE \u09B9\u09AC\u09C7\u0964`;
      }
      case "phishing_or_social_engineering":
        return `\u098F\u099F\u09BF \u09B0\u09BF\u09AA\u09CB\u09B0\u09CD\u099F \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0986\u09A8\u09CD\u09A4\u09B0\u09BF\u0995 \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6 \u2014 \u0986\u09AA\u09A8\u09BF \u098F\u0995\u09A6\u09AE \u09B8\u09A0\u09BF\u0995 \u0995\u09BE\u099C \u0995\u09B0\u09C7\u099B\u09C7\u09A8\u0964 \u0986\u09AE\u09B0\u09BE \u09B8\u09CD\u09AA\u09B7\u09CD\u099F\u09AD\u09BE\u09AC\u09C7 \u099C\u09BE\u09A8\u09BE\u09A4\u09C7 \u099A\u09BE\u0987: \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09CB\u09A8\u09CB \u09AA\u09CD\u09B0\u09A4\u09BF\u09A8\u09BF\u09A7\u09BF \u0995\u0996\u09A8\u09CB \u09AA\u09BF\u09A8, \u0993\u099F\u09BF\u09AA\u09BF, \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AC\u09BE \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u0995\u09CB\u09A1 \u099A\u09BE\u0987\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964 \u0995\u09CB\u09A8\u09CB \u09AA\u09B0\u09BF\u09B8\u09CD\u09A5\u09BF\u09A4\u09BF\u09A4\u09C7\u0987 \u098F\u0987 \u09A4\u09A5\u09CD\u09AF \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09AB\u09CD\u09B0\u09A1 \u0993 \u09B0\u09BF\u09B8\u09CD\u0995 \u09A6\u09B2 \u098F\u099F\u09BF \u09A4\u09A6\u09A8\u09CD\u09A4 \u0995\u09B0\u099B\u09C7\u0964 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0995\u09CD\u09B7\u09A4\u09BF\u0997\u09CD\u09B0\u09B8\u09CD\u09A4 \u09AE\u09A8\u09C7 \u09B9\u09B2\u09C7 \u098F\u0996\u09A8\u0987 \u0985\u09CD\u09AF\u09BE\u09AA \u09A5\u09C7\u0995\u09C7 \u09AA\u09BF\u09A8 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09C1\u09A8\u0964`;
      default: {
        if (anomaly && anomaly.type === "multiple_same_amount_different_recipients") {
          const txnCount = anomaly.transactions.length;
          const amountMentioned = anomaly.transactions[0]?.amount;
          return `\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7 \u09B8\u09AE\u09CD\u09AA\u09CD\u09B0\u09A4\u09BF \u0995\u09BF\u099B\u09C1 \u0985\u09B8\u09CD\u09AC\u09BE\u09AD\u09BE\u09AC\u09BF\u0995 \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8 \u09A6\u09C7\u0996\u09BE \u09AF\u09BE\u099A\u09CD\u099B\u09C7 \u2014 ${amountMentioned ? `${fmt(amountMentioned)} \u099F\u09BE\u0995\u09BE\u09B0 ` : ""}${txnCount}\u099F\u09BF \u099F\u09CD\u09B0\u09BE\u09A8\u09CD\u09B8\u09AB\u09BE\u09B0 \u09AC\u09BF\u09AD\u09BF\u09A8\u09CD\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0\u09C7 \u0997\u09C7\u099B\u09C7, \u09AF\u09BE \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A6\u09C3\u09B7\u09CD\u099F\u09BF\u09A4\u09C7 \u09AA\u09A1\u09BC\u09C7\u099B\u09C7\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09AA\u09CB\u09B0\u09CD\u099F \u09A6\u09B2 \u09AC\u09BF\u09B7\u09AF\u09BC\u099F\u09BF \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4\u09AD\u09BE\u09AC\u09C7 \u09AA\u09B0\u09CD\u09AF\u09BE\u09B2\u09CB\u099A\u09A8\u09BE \u0995\u09B0\u09AC\u09C7\u09A8 \u098F\u09AC\u0982 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u098F\u0995\u099F\u09BF \u09B8\u09CD\u09AA\u09B7\u09CD\u099F \u09AC\u09CD\u09AF\u09BE\u0996\u09CD\u09AF\u09BE \u0993 \u09AA\u09B0\u09AC\u09B0\u09CD\u09A4\u09C0 \u09AA\u09A6\u0995\u09CD\u09B7\u09C7\u09AA \u099C\u09BE\u09A8\u09BE\u09AC\u09C7\u09A8\u0964 \u09A4\u09A6\u09A8\u09CD\u09A4\u09C7\u09B0 \u09B8\u09AE\u09AF\u09BC \u09AA\u09BF\u09A8 \u09AC\u09BE \u0993\u099F\u09BF\u09AA\u09BF \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
        }
        if (anomaly && anomaly.type === "failed_after_completed") {
          const completedTxn = anomaly.transactions[0];
          return `\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6 \u2014 \u098F\u0987 \u09AA\u09B0\u09BF\u09B8\u09CD\u09A5\u09BF\u09A4\u09BF \u09AC\u09BF\u09AD\u09CD\u09B0\u09BE\u09A8\u09CD\u09A4\u09BF\u0995\u09B0 \u09B9\u0993\u09AF\u09BC\u09BE\u099F\u09BE\u0987 \u09B8\u09CD\u09AC\u09BE\u09AD\u09BE\u09AC\u09BF\u0995\u0964 \u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u099B\u09BF ${completedTxn?.amount ? `${fmt(completedTxn.amount)} \u099F\u09BE\u0995\u09BE\u09B0` : "\u098F\u0995\u099F\u09BF"} \u099F\u09CD\u09B0\u09BE\u09A8\u09CD\u09B8\u09AB\u09BE\u09B0 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7${completedTxn?.transaction_id ? ` (${completedTxn.transaction_id})` : ""}, \u0995\u09BF\u09A8\u09CD\u09A4\u09C1 \u09AA\u09B0\u09AC\u09B0\u09CD\u09A4\u09C0 \u098F\u0995\u099F\u09BF \u09AA\u09CD\u09B0\u099A\u09C7\u09B7\u09CD\u099F\u09BE \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u09AE\u09C2\u09B2 \u099F\u09CD\u09B0\u09BE\u09A8\u09CD\u09B8\u09AB\u09BE\u09B0\u099F\u09BF \u09B8\u09AE\u09CD\u09AD\u09AC\u09A4 \u09B8\u09AB\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A6\u09B2 \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09AC\u09C7\u09A8 \u098F\u09AC\u0982 \u09B8\u09A0\u09BF\u0995 \u09A4\u09A5\u09CD\u09AF \u099C\u09BE\u09A8\u09BE\u09AC\u09C7\u09A8\u0964 \u09AA\u09BF\u09A8 \u09AC\u09BE \u0993\u099F\u09BF\u09AA\u09BF \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
        }
        return `\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997 \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09AE\u09CD\u09AA\u09B0\u09CD\u0995\u09BF\u09A4 \u0989\u09A6\u09CD\u09AC\u09C7\u0997\u099F\u09BF \u0986\u09AE\u09B0\u09BE \u0997\u09C1\u09B0\u09C1\u09A4\u09CD\u09AC\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09A8\u09BF\u099A\u09CD\u099B\u09BF\u0964 \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B8\u09AE\u09BE\u09A7\u09BE\u09A8\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u09A4\u09BE\u09B0\u09BF\u0996, \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3 \u09AC\u09BE \u09B2\u09C7\u09A8\u09A6\u09C7\u09A8\u09C7\u09B0 \u09A7\u09B0\u09A8 \u099C\u09BE\u09A8\u09BE\u09A8 \u2014 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A6\u09B2 \u09A4\u0996\u09A8 \u0986\u09B0\u09CB \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u09A8\u0964 \u09AA\u09BF\u09A8 \u09AC\u09BE \u0993\u099F\u09BF\u09AA\u09BF \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 \u09B6\u09C7\u09AF\u09BC\u09BE\u09B0 \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
      }
    }
  }
  switch (caseType) {
    case "wrong_transfer": {
      const opening = amtFmt ? `${amtFmt} \u099F\u09BE${counterparty ? ` ${cpFmt}-\u098F` : ""} transfer \u09B9\u09AF\u09BC\u09C7 \u0997\u09C7\u099B\u09C7${txnRef} \u2014 \u098F\u099F\u09BE \u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF\u0964` : `\u0986\u09AA\u09A8\u09BE\u09B0 transfer \u098F\u09B0 complaint${txnRef} \u099F\u09BE \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
      return `\u0986\u09AA\u09A8\u09BE\u09B0 complaint \u099F\u09BE \u09AA\u09C7\u09AF\u09BC\u09C7 \u09B8\u09A4\u09CD\u09AF\u09BF\u0987 \u0996\u09BE\u09B0\u09BE\u09AA \u09B2\u09BE\u0997\u099B\u09C7 \u2014 \u098F\u0987 situation \u098F \u0986\u09AA\u09A8\u09BF \u0995\u09A4\u099F\u09BE stressed \u09B8\u09C7\u099F\u09BE \u09AC\u09C1\u099D\u09A4\u09C7 \u09AA\u09BE\u09B0\u099B\u09BF\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 Dispute Resolution team \u098F\u0996\u09A8\u0987 \u098F\u099F\u09BE investigate \u0995\u09B0\u09AC\u09C7\u0964 \u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BE step \u098F \u0986\u09AA\u09A8\u09BE\u0995\u09C7 update \u09A6\u09C7\u0993\u09AF\u09BC\u09BE \u09B9\u09AC\u09C7\u0964 Please \u0995\u0996\u09A8\u09CB PIN \u09AC\u09BE OTP \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 share \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
    }
    case "payment_failed": {
      const opening = amtFmt ? `\u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF ${amtFmt} \u098F\u09B0 payment${txnRef} expected \u09AD\u09BE\u09AC\u09C7 complete \u09B9\u09AF\u09BC\u09A8\u09BF\u0964` : `\u0986\u09AA\u09A8\u09BE\u09B0 payment complaint${txnRef} \u0986\u09AE\u09B0\u09BE \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
      return `Payment \u09A8\u09BE \u09B9\u0993\u09AF\u09BC\u09BE\u099F\u09BE \u09B8\u09A4\u09CD\u09AF\u09BF\u0987 frustrating \u2014 \u098F\u099F\u09BE \u0986\u09AE\u09B0\u09BE \u09AC\u09C1\u099D\u09BF\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 Payments team \u098F\u099F\u09BE \u098F\u0996\u09A8\u0987 review \u0995\u09B0\u099B\u09C7\u0964 Balance deduct \u09B9\u09B2\u09C7 \u09B8\u09C7\u099F\u09BE policy \u0985\u09A8\u09C1\u09AF\u09BE\u09AF\u09BC\u09C0 handle \u0995\u09B0\u09BE \u09B9\u09AC\u09C7\u0964 Shortly \u0986\u09AA\u09A8\u09BE\u0995\u09C7 update \u09A6\u09C7\u0993\u09AF\u09BC\u09BE \u09B9\u09AC\u09C7\u0964 PIN \u09AC\u09BE OTP share \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
    }
    case "refund_request": {
      if (isBuyersRemorse) {
        return `\u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09CB\u0997\u09BE\u09AF\u09CB\u0997\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964 situation \u099F\u09BE \u0986\u09AE\u09B0\u09BE \u09AC\u09C1\u099D\u09A4\u09C7 \u09AA\u09BE\u09B0\u099B\u09BF\u0964 \u0995\u09BF\u09A8\u09CD\u09A4\u09C1 \u098F\u0995\u099F\u09C1 \u099C\u09BE\u09A8\u09BE\u0987 \u2014 ${amtFmt ? `${amtFmt} \u098F\u09B0` : "\u098F\u0987"} payment${counterparty ? ` ${cpFmt}-\u0995\u09C7` : " merchant \u0995\u09C7"} successfully complete \u09B9\u09AF\u09BC\u09C7 \u0997\u09C7\u099B\u09C7${txnRef}\u0964 \u09B6\u09C1\u09A7\u09C1 change of mind \u098F\u09B0 \u0995\u09BE\u09B0\u09A3\u09C7 platform \u09A5\u09C7\u0995\u09C7 refund \u0995\u09B0\u09BE \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 policy \u09A4\u09C7 \u09A8\u09C7\u0987, \u0995\u09BE\u09B0\u09A3 \u099F\u09BE\u0995\u09BE \u099A\u09B2\u09C7 \u0997\u09C7\u099B\u09C7\u0964 Merchant \u098F\u09B0 \u09B8\u09BE\u09A5\u09C7 directly \u0995\u09A5\u09BE \u09AC\u09B2\u09B2\u09C7 \u09A4\u09BE\u09B0\u09BE help \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u0964 Technical error \u09A5\u09BE\u0995\u09B2\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u099C\u09BE\u09A8\u09BE\u09A8\u0964`;
      }
      const opening = amtFmt ? `${amtFmt} \u098F\u09B0 refund request${txnRef} \u0986\u09AE\u09B0\u09BE \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964` : `Refund request${txnRef} \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
      return `${opening} \u099C\u09BE\u09A8\u09BF \u098F\u099F\u09BE \u0986\u09AA\u09A8\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0995\u09A4\u099F\u09BE important\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 team transaction details verify \u0995\u09B0\u09AC\u09C7 \u098F\u09AC\u0982 policy \u0985\u09A8\u09C1\u09AF\u09BE\u09AF\u09BC\u09C0 \u09AF\u09A4 \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B8\u09AE\u09CD\u09AD\u09AC \u09B8\u09AE\u09BE\u09A7\u09BE\u09A8 \u0995\u09B0\u09AC\u09C7\u0964 \u098F\u0995\u099F\u09C1 patience \u09B0\u09BE\u0996\u09C1\u09A8 \u2014 \u0986\u09AE\u09B0\u09BE \u0986\u09AA\u09A8\u09BE\u0995\u09C7 update \u09B0\u09BE\u0996\u09AC\u0964 PIN \u09AC\u09BE OTP share \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
    }
    case "duplicate_payment": {
      const opening = amtFmt ? `${amtFmt} \u098F\u09B0 double charge${txnRef} \u098F\u09B0 \u09AC\u09BF\u09B7\u09AF\u09BC\u099F\u09BE \u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u099B\u09BF\u0964` : `Double charge \u098F\u09B0 complaint${txnRef} \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
      return `Double charge \u09B9\u0993\u09AF\u09BC\u09BE\u099F\u09BE definitely concerning\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 Payments team \u09B8\u09AC transaction records review \u0995\u09B0\u09AC\u09C7 \u098F\u09AC\u0982 duplicate confirm \u09B9\u09B2\u09C7 official process \u098F handle \u0995\u09B0\u09BE \u09B9\u09AC\u09C7\u0964 \u09B6\u09C0\u0998\u09CD\u09B0\u0987 update \u0986\u09B8\u09AC\u09C7\u0964`;
    }
    case "merchant_settlement_delay": {
      const opening = amtFmt ? `${amtFmt} \u098F\u09B0 settlement${txnRef} delay \u09B9\u099A\u09CD\u099B\u09C7 \u2014 \u098F\u099F\u09BE \u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u099B\u09BF\u0964` : `Merchant settlement delay \u098F\u09B0 complaint${txnRef} \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
      return `Merchant settlement \u098F \u09A6\u09C7\u09B0\u09BF \u09B9\u0993\u09AF\u09BC\u09BE\u099F\u09BE obviously business \u098F\u09B0 \u099C\u09A8\u09CD\u09AF problem\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 Merchant Operations team \u098F\u099F\u09BE \u09A6\u09C7\u0996\u09AC\u09C7 \u098F\u09AC\u0982 \u09A6\u09CD\u09B0\u09C1\u09A4 update \u09A6\u09C7\u0993\u09AF\u09BC\u09BE \u09B9\u09AC\u09C7\u0964`;
    }
    case "agent_cash_in_issue": {
      const opening = amtFmt ? `\u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF ${amtFmt} \u098F\u09B0 cash in${counterparty ? ` (${cpFmt})` : ""}${txnRef} balance \u098F reflect \u09B9\u09AF\u09BC\u09A8\u09BF\u0964` : `Cash in complaint${txnRef} \u09AA\u09C7\u09AF\u09BC\u09C7\u099B\u09BF\u0964`;
      return `Balance update \u09A8\u09BE \u09B9\u0993\u09AF\u09BC\u09BE\u099F\u09BE definitely inconvenient \u2014 \u098F\u099C\u09A8\u09CD\u09AF sorry\u0964 ${opening} \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 Agent Operations team \u098F\u099F\u09BE verify \u0995\u09B0\u09AC\u09C7 \u098F\u09AC\u0982 discrepancy \u09A5\u09BE\u0995\u09B2\u09C7 fix \u0995\u09B0\u09BE \u09B9\u09AC\u09C7\u0964 Shortly contact \u0995\u09B0\u09BE \u09B9\u09AC\u09C7\u0964`;
    }
    case "phishing_or_social_engineering":
      return `Report \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6 \u2014 \u098F\u099F\u09BE \u0995\u09B0\u09BE \u098F\u0995\u09A6\u09AE \u09B8\u09A0\u09BF\u0995 \u099B\u09BF\u09B2\u0964 Clearly \u09AC\u09B2\u099B\u09BF: \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 team \u0995\u0996\u09A8\u09CB PIN, OTP \u09AC\u09BE password \u099A\u09BE\u0987\u09AC\u09C7 \u09A8\u09BE \u2014 \u0995\u09C7\u0989 \u099A\u09BE\u0987\u09B2\u09C7 \u09B8\u09C7\u099F\u09BE definitely scam\u0964 Share \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 Fraud team \u098F\u099F\u09BE urgently investigate \u0995\u09B0\u09AC\u09C7\u0964 Account compromise \u09B9\u09AF\u09BC\u09C7 \u09A5\u09BE\u0995\u09B2\u09C7 \u098F\u0996\u09A8\u0987 app \u09A5\u09C7\u0995\u09C7 PIN change \u0995\u09B0\u09C1\u09A8\u0964`;
    default: {
      if (anomaly && anomaly.type === "multiple_same_amount_different_recipients") {
        const txnCount = anomaly.transactions.length;
        const amountMentioned = anomaly.transactions[0]?.amount;
        const uniqueCps = [...new Set(anomaly.transactions.map((t) => t.counterparty).filter(Boolean))];
        return `\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 contact \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 account \u098F \u0995\u09BF\u099B\u09C1 unusual activity \u09A6\u09C7\u0996\u09BE \u09AF\u09BE\u099A\u09CD\u099B\u09C7 \u2014 ${amountMentioned ? `${fmt(amountMentioned)} \u098F\u09B0 ` : ""}${txnCount}\u099F\u09BE transfer ${uniqueCps.length > 1 ? `${uniqueCps.length}\u099F\u09BE different number \u098F` : "same number \u098F"} \u0997\u09C7\u099B\u09C7${uniqueCps.length > 1 ? ` (${uniqueCps.join(", ")})` : ""}\u0964 \u098F\u099F\u09BE clearly investigate \u0995\u09B0\u09BE \u09A6\u09B0\u0995\u09BE\u09B0\u0964 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 team \u09AA\u09C1\u09B0\u09CB history \u099F\u09BE carefully \u09A6\u09C7\u0996\u09AC\u09C7 \u098F\u09AC\u0982 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 exactly \u0995\u09C0 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u09B8\u09C7\u099F\u09BE \u099C\u09BE\u09A8\u09BE\u09AC\u09C7\u0964 Please PIN \u09AC\u09BE OTP \u0995\u09BE\u09B0\u09CB \u09B8\u09BE\u09A5\u09C7 share \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
      }
      if (anomaly && anomaly.type === "failed_after_completed") {
        const completedTxn = anomaly.transactions[0];
        return `Confusing situation \u099F\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u0986\u09AE\u09B0\u09BE sorry\u0964 \u0986\u09AE\u09B0\u09BE \u09A6\u09C7\u0996\u09A4\u09C7 \u09AA\u09BE\u099A\u09CD\u099B\u09BF ${completedTxn?.amount ? `${fmt(completedTxn.amount)} \u098F\u09B0 ` : ""}\u098F\u0995\u099F\u09BE transfer successfully complete \u09B9\u09AF\u09BC\u09C7\u099B\u09C7${completedTxn?.transaction_id ? ` (${completedTxn.transaction_id})` : ""}, \u0995\u09BF\u09A8\u09CD\u09A4\u09C1 \u09AA\u09B0\u09C7\u09B0 attempt \u099F\u09BE fail \u0995\u09B0\u09C7\u099B\u09C7\u0964 Original transfer \u099F\u09BE likely \u0997\u09C7\u099B\u09C7 \u2014 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 team confirm \u0995\u09B0\u09AC\u09C7\u0964 Update \u09A6\u09C7\u0993\u09AF\u09BC\u09BE \u09B9\u09AC\u09C7\u0964 PIN \u09AC\u09BE OTP share \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
      }
      return `\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 contact \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6! Account \u098F\u09B0 \u0995\u09CB\u09A8\u09CB concern \u0986\u099B\u09C7 \u2014 \u09B8\u09C7\u099F\u09BE \u0986\u09AE\u09B0\u09BE seriously \u09A8\u09BF\u099A\u09CD\u099B\u09BF\u0964 \u098F\u0995\u099F\u09C1 \u09AC\u09C7\u09B6\u09BF detail \u09A6\u09BF\u09B2\u09C7 \u2014 \u09AF\u09C7\u09AE\u09A8 date, amount, \u09AC\u09BE \u0995\u09CB\u09A8 transaction \u2014 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 team \u0986\u09B0\u09CB \u09A6\u09CD\u09B0\u09C1\u09A4 help \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09AC\u09C7\u0964 PIN \u09AC\u09BE OTP share \u0995\u09B0\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964`;
    }
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
  const language = input.language ?? "en";
  const signals = extractSignals(input.complaint);
  const caseType = classifyCaseType(signals);
  const { txn, score: txnScore, isDuplicate } = findRelevantTransaction(transactions, signals, caseType);
  const anomaly = detectMultiTransactionAnomalies(transactions, caseType);
  const isBuyersRemorse = caseType === "refund_request" && signals.hasBuyersRemorseSignal;
  const evidenceVerdict = determineEvidenceVerdict(txn, caseType, signals, transactions, isDuplicate);
  const severity = determineSeverity(caseType, evidenceVerdict, signals, txn);
  const department = determineDepartment(caseType, severity, evidenceVerdict);
  const humanReviewRequired = determineHumanReview(caseType, severity, evidenceVerdict, txn, signals);
  const agentSummary = generateAgentSummary(
    caseType,
    evidenceVerdict,
    department,
    txn,
    signals,
    transactions,
    anomaly,
    isBuyersRemorse
  );
  const recommendedNextAction = generateRecommendedNextAction(caseType, evidenceVerdict, txn);
  const customerReply = generateCustomerReply(caseType, language, {
    txnId: txn?.transaction_id ?? null,
    ...txn?.amount !== void 0 ? { amount: txn.amount } : {},
    counterparty: txn?.counterparty ?? null,
    isBuyersRemorse,
    anomaly
  });
  const confidence = calculateConfidence(txn, txnScore, signals, evidenceVerdict, caseType);
  const reasonCodes = buildReasonCodes(caseType, txn, signals, evidenceVerdict, humanReviewRequired, isDuplicate, severity);
  if (anomaly.type !== "none") reasonCodes.push("multi_transaction_anomaly_detected");
  if (isBuyersRemorse) reasonCodes.push("buyers_remorse_detected");
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
    reason_codes: [...new Set(reasonCodes)]
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
      const issues = parseResult.error.issues;
      const firstIssue = issues[0];
      const fieldLabels = {
        ticket_id: "Ticket ID",
        complaint: "Complaint",
        language: "Language",
        channel: "Channel",
        user_type: "User Type",
        transaction_history: "Transaction History",
        campaign_context: "Campaign Context",
        metadata: "Metadata"
      };
      if (firstIssue?.path[0] === "complaint" && firstIssue?.code === "too_small") {
        res.status(422).json({
          error: true,
          message: "Your complaint message cannot be empty. Please describe your issue and try again."
        });
        return;
      }
      const details = issues.map((issue) => {
        const field = issue.path.length > 0 ? fieldLabels[String(issue.path[0])] ?? String(issue.path[0]) : "Request body";
        const code = issue.code;
        if (code === "invalid_enum_value" || code === "invalid_value") {
          const received = issue.received ?? issue.input;
          const options = issue.options ?? issue.values;
          return `'${field}' has an invalid value '${received}'. Accepted values are: ${Array.isArray(options) ? options.join(", ") : "see documentation"}.`;
        }
        if (issue.code === "invalid_type" && issue.received === "undefined") {
          return `'${field}' is required but was not provided.`;
        }
        return `'${field}': ${issue.message}`;
      });
      res.status(400).json({
        error: true,
        message: "We were unable to process your request due to invalid input. Please review the details below and try again.",
        details
      });
      return;
    }
    const input = parseResult.data;
    if (!input.complaint.trim()) {
      res.status(422).json({
        error: true,
        message: "Your complaint message cannot be empty or contain only spaces. Please describe your issue and try again."
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
        message: "We received a request in an unexpected format. Please check your input and try again."
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
