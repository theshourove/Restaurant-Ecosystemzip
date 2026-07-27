import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import membersRouter from "./members";
import couponsRouter from "./coupons";
import ridersRouter from "./riders";
import usersRouter from "./users";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(membersRouter);
router.use(couponsRouter);
router.use(ridersRouter);
router.use(usersRouter);
router.use(settingsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
