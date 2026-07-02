CREATE TYPE "public"."talla" AS ENUM('S', 'M', 'L', 'XL', 'XXL', 'XXXL');--> statement-breakpoint
CREATE TYPE "public"."tipo_compra" AS ENUM('contado', 'credito');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento" AS ENUM('entrada', 'venta', 'traslado');--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre_equipo" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maletas" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo_maleta" text NOT NULL,
	"descripcion" text
);
--> statement-breakpoint
CREATE TABLE "camisetas" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipo_id" integer NOT NULL,
	"url_imagen" text,
	"descripcion" text
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"proveedor_id" integer NOT NULL,
	"fecha_ingreso" date NOT NULL,
	"tipo_compra" "tipo_compra" NOT NULL,
	"costo_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventario" (
	"id" serial PRIMARY KEY NOT NULL,
	"camiseta_id" integer NOT NULL,
	"lote_id" integer NOT NULL,
	"maleta_id" integer NOT NULL,
	"talla" "talla" NOT NULL,
	"costo_unidad" numeric(12, 2) NOT NULL,
	"precio_venta" numeric(12, 2) NOT NULL,
	"cantidad_disponible" integer DEFAULT 0 NOT NULL,
	"expuesto" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kardex" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo_movimiento" "tipo_movimiento" NOT NULL,
	"camiseta_id" integer NOT NULL,
	"talla" "talla" NOT NULL,
	"cantidad" integer NOT NULL,
	"maleta_id" integer,
	"maleta_destino_id" integer,
	"precio_unitario" numeric(12, 2),
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venta_detalles" (
	"id" serial PRIMARY KEY NOT NULL,
	"venta_id" integer NOT NULL,
	"inventario_id" integer,
	"camiseta_id" integer NOT NULL,
	"talla" "talla" NOT NULL,
	"maleta_id" integer,
	"cantidad" integer NOT NULL,
	"costo_unidad" numeric(12, 2) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"utilidad" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ventas" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_camisetas" integer NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"utilidad" numeric(12, 2) NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "camisetas" ADD CONSTRAINT "camisetas_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_camiseta_id_camisetas_id_fk" FOREIGN KEY ("camiseta_id") REFERENCES "public"."camisetas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_maleta_id_maletas_id_fk" FOREIGN KEY ("maleta_id") REFERENCES "public"."maletas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex" ADD CONSTRAINT "kardex_camiseta_id_camisetas_id_fk" FOREIGN KEY ("camiseta_id") REFERENCES "public"."camisetas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex" ADD CONSTRAINT "kardex_maleta_id_maletas_id_fk" FOREIGN KEY ("maleta_id") REFERENCES "public"."maletas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kardex" ADD CONSTRAINT "kardex_maleta_destino_id_maletas_id_fk" FOREIGN KEY ("maleta_destino_id") REFERENCES "public"."maletas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_detalles" ADD CONSTRAINT "venta_detalles_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_detalles" ADD CONSTRAINT "venta_detalles_inventario_id_inventario_id_fk" FOREIGN KEY ("inventario_id") REFERENCES "public"."inventario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_detalles" ADD CONSTRAINT "venta_detalles_camiseta_id_camisetas_id_fk" FOREIGN KEY ("camiseta_id") REFERENCES "public"."camisetas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venta_detalles" ADD CONSTRAINT "venta_detalles_maleta_id_maletas_id_fk" FOREIGN KEY ("maleta_id") REFERENCES "public"."maletas"("id") ON DELETE no action ON UPDATE no action;