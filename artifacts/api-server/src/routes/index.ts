import { Router, type IRouter } from "express";
import healthRouter from "./health";
import airfareRouter from "./airfare";
import m2mRouter from "./m2m";
import scraperRouter from "./scraper";
import databaseRouter from "./database";

const router: IRouter = Router();

router.use(healthRouter);
router.use(airfareRouter);
router.use(m2mRouter);
router.use(scraperRouter);
router.use(databaseRouter);

export default router;
