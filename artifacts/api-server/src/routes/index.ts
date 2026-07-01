import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import proveedoresRouter from "./proveedores";
import equiposRouter from "./equipos";
import maletasRouter from "./maletas";
import camisetasRouter from "./camisetas";
import lotesRouter from "./lotes";
import inventarioRouter from "./inventario";
import kardexRouter from "./kardex";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use(proveedoresRouter);
router.use(equiposRouter);
router.use(maletasRouter);
router.use(camisetasRouter);
router.use(lotesRouter);
router.use(inventarioRouter);
router.use(kardexRouter);
router.use(dashboardRouter);

export default router;
