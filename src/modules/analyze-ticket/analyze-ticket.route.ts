// ============================================================
// QueueStorm Investigator — Route
// ============================================================

import { Router } from "express";
import { analyzeTicketController } from "./analyze-ticket.controller.js";

const analyzeTicketRouter = Router();

analyzeTicketRouter.post("/", analyzeTicketController);

export default analyzeTicketRouter;
