CREATE TABLE usuarios(
	idUser INT PRIMARY KEY AUTO_INCREMENT,
	username VARCHAR(45) NOT NULL,
	email VARCHAR(200) NOT NULL,
	password VARCHAR(200) NOT NULL,
	tipo VARCHAR(20),
	name VARCHAR(50)
);

CREATE TABLE proveedores (
    id_proveedor INT AUTO_INCREMENT PRIMARY KEY,
    rut CHAR(12) NOT NULL UNIQUE,
    nombre VARCHAR(100),
    nombre_empresa VARCHAR(100),
    telefono VARCHAR(20),
    correo_electronico VARCHAR(100),
    comentarios VARCHAR(255)
);

CREATE TABLE encargos (
	id_encargo INT AUTO_INCREMENT PRIMARY KEY,
    fecha_realizado DATE NOT NULL,
    fecha_prevista_llegada DATE,
    comentarios VARCHAR(255),
    estado ENUM('realizado', 'recibido') NOT NULL DEFAULT 'realizado',
    id_proveedor INT,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

CREATE TABLE materiaprima (
    id_materia_prima INT AUTO_INCREMENT PRIMARY KEY,
    categoria ENUM('tabla','palo','clavo','fibra') NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    precio_unidad DECIMAL(10,2),
    stock INT,
    foto VARCHAR(255),
    comentarios VARCHAR(255)
);

CREATE TABLE encargo_detalles (
    id_encargo_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_encargo INT NOT NULL,
    id_materia_prima INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (id_encargo) REFERENCES encargos(id_encargo),
    FOREIGN KEY (id_materia_prima) REFERENCES materiaprima(id_materia_prima)
);

CREATE TABLE tablas (
    id_materia_prima INT PRIMARY KEY,
    largo_cm FLOAT,
    ancho_cm FLOAT,
    espesor_mm FLOAT,
    tipo_madera VARCHAR(50),
    cepilladas BOOLEAN,
    FOREIGN KEY (id_materia_prima) REFERENCES materiaprima(id_materia_prima)
);

CREATE TABLE palos (
    id_materia_prima INT PRIMARY KEY,
    largo_cm FLOAT,
    diametro_mm FLOAT,
    tipo_madera VARCHAR(50),
    FOREIGN KEY (id_materia_prima) REFERENCES materiaprima(id_materia_prima)
);

CREATE TABLE clavos (
    id_materia_prima INT PRIMARY KEY,
    tipo VARCHAR(50),
    medidas VARCHAR(50),
    material VARCHAR(50) ,
    FOREIGN KEY (id_materia_prima) REFERENCES materiaprima(id_materia_prima)
);

CREATE TABLE fibras (
    id_materia_prima INT PRIMARY KEY,
    ancho_cm FLOAT,
    largo_cm FLOAT,
    FOREIGN KEY (id_materia_prima) REFERENCES materiaprima(id_materia_prima)
);

CREATE TABLE tipo_tablas (
    id_tipo_tabla INT AUTO_INCREMENT PRIMARY KEY,
    id_materia_prima INT NOT NULL,
    titulo VARCHAR(100),
    largo_cm FLOAT,
    ancho_cm FLOAT,
    espesor_mm FLOAT,
    foto VARCHAR(255),
    precio_unidad DECIMAL(10,2),
    cepillada BOOLEAN,
    stock INT DEFAULT 0,
    FOREIGN KEY (id_materia_prima) REFERENCES tablas(id_materia_prima)
);

CREATE TABLE tipo_tacos (
    id_tipo_taco INT AUTO_INCREMENT PRIMARY KEY,
    id_materia_prima INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    largo_cm FLOAT,
    ancho_cm FLOAT,
    espesor_mm FLOAT,
    stock INT DEFAULT 0,
    precio_unidad DECIMAL(10,2),
    foto VARCHAR(255),
    FOREIGN KEY (id_materia_prima) REFERENCES palos(id_materia_prima)
);

CREATE TABLE tipo_patines (
    id_tipo_patin INT AUTO_INCREMENT PRIMARY KEY,
    id_tipo_tabla INT NOT NULL,
    id_tipo_taco INT NOT NULL,
    titulo VARCHAR(100),
    medidas VARCHAR(100),
    logo VARCHAR(255),
    precio_unidad DECIMAL(10,2),
    stock FLOAT,
    comentarios VARCHAR(255),
    FOREIGN KEY (id_tipo_tabla) REFERENCES tipo_tablas(id_tipo_tabla),
    FOREIGN KEY (id_tipo_taco)  REFERENCES tipo_tacos(id_tipo_taco)
);

CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    estado BOOLEAN DEFAULT TRUE,
    es_empresa BOOLEAN DEFAULT FALSE,
    nombre_empresa VARCHAR(100),
    direccion_empresa VARCHAR(255),
    email_empresa VARCHAR(100)
);

CREATE TABLE prototipo_pallet (
    id_prototipo INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    medidas VARCHAR(100),
    id_tipo_patin INT NULL,
    cantidad_patines INT,
    comentarios VARCHAR(255),
	foto VARCHAR(255),
    id_cliente INT,
	estado BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_tipo_patin) REFERENCES tipo_patines(id_tipo_patin),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE prototipo_tipo_tablas (
    id_prototipo INT NOT NULL,
    id_tipo_tabla INT NOT NULL,
    cantidad_lleva INT NOT NULL,
    aclaraciones VARCHAR(200),
    PRIMARY KEY (id_prototipo, id_tipo_tabla),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_tipo_tabla) REFERENCES tipo_tablas(id_tipo_tabla)
);

CREATE TABLE prototipo_tipo_tacos (
    id_prototipo INT NOT NULL,
    id_tipo_taco INT NOT NULL,
    cantidad_lleva INT NOT NULL,
    aclaraciones VARCHAR(200),
    PRIMARY KEY (id_prototipo, id_tipo_taco),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_tipo_taco) REFERENCES tipo_tacos(id_tipo_taco)
);

CREATE TABLE prototipo_clavos (
    id_prototipo INT NOT NULL,
    id_materia_prima INT NOT NULL,
    cantidad_lleva INT NOT NULL,
    aclaraciones VARCHAR(200),
    PRIMARY KEY (id_prototipo, id_materia_prima),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_materia_prima) REFERENCES clavos(id_materia_prima)
);

CREATE TABLE prototipo_fibras (
    id_prototipo INT NOT NULL,
    id_materia_prima  INT NOT NULL, 
    cantidad_lleva INT NOT NULL,
    aclaraciones VARCHAR(200),
    PRIMARY KEY (id_prototipo, id_materia_prima),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_materia_prima) REFERENCES fibras(id_materia_prima)
);

CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    estado ENUM('pendiente','en_produccion','listo','entregado','cancelado')
					DEFAULT 'pendiente',
    fecha_realizado DATE,
    fecha_de_entrega DATE,
    precio_total DECIMAL(10,2),
    comentarios VARCHAR(255),
    eliminado BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE pedido_prototipo_pallet (
    id_pedido INT NOT NULL,
    id_prototipo INT NOT NULL,
    cantidad_pallets INT,
    numero_lote VARCHAR(50),
    numero_tratamiento VARCHAR(50),
    comentarios VARCHAR(255),
    PRIMARY KEY (id_pedido, id_prototipo),
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo)
);

CREATE TABLE entregas_transporte (
    id_entrega INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT,
    fecha_entrega DATETIME,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
);


CREATE TABLE ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    fecha_realizada DATE NOT NULL,
    precio_total DECIMAL(10,2),
    id_cliente INT,
    foto VARCHAR(255),
    comentarios VARCHAR(255),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE fuego_ya (
    id_fuego_ya INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100),
    precio_unidad DECIMAL(10,2),
    stock INT,
    foto VARCHAR(255)
);

CREATE TABLE venta_fuegoya (
    id_ventaFuegoya INT AUTO_INCREMENT PRIMARY KEY,
    fecha_realizada DATE NOT NULL,
    precio_total DECIMAL(10,2),
    id_cliente INT,
    id_fuego_ya INT,
    cantidadbolsas INT,
    foto VARCHAR(255),
    comentarios VARCHAR(255),
    estadopago ENUM('credito', 'pago'),
    fechapago DATETIME,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_fuego_ya) REFERENCES fuego_ya(id_fuego_ya)
);

CREATE TABLE pellets (
    id_pellet INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    bolsa_kilogramos FLOAT,
    precio_unidad DECIMAL(10,2),
    stock INT,
    foto VARCHAR(255)
);

/* VIEW para listar las materias primas con stock bajo 'menor a 100' */
CREATE VIEW stock_bajo AS
SELECT 'materiaprima' AS origen, id_materia_prima AS id, titulo, stock
FROM materiaprima WHERE stock < 500
UNION ALL
SELECT 'tipo_tablas', id_tipo_tabla, titulo, stock FROM tipo_tablas WHERE stock < 500
UNION ALL
SELECT 'tipo_tacos', id_tipo_taco, titulo, stock FROM tipo_tacos WHERE stock < 500
UNION ALL
SELECT 'tipo_patines', id_tipo_patin, titulo, stock FROM tipo_patines WHERE stock < 500
UNION ALL
SELECT 'fuego_ya', id_fuego_ya, tipo, stock FROM fuego_ya WHERE stock < 500
UNION ALL
SELECT 'pellets', id_pellet, titulo, stock FROM pellets WHERE stock < 500;

SELECT * FROM stock_bajo;


-- ===========================================
-- 1) BOM detallado (incluye PATÍN con cantidad)
-- ===========================================
DROP VIEW IF EXISTS vw_prototipo_bom_detalle;
CREATE VIEW vw_prototipo_bom_detalle AS
/* ====== TABLAS ====== */
SELECT 
  ptt.id_prototipo,
  'tabla'                           AS categoria,
  ptt.id_tipo_tabla                 AS id_item,
  tt.titulo                         AS titulo,
  ptt.aclaraciones,
  ptt.cantidad_lleva                AS cantidad,
  COALESCE(tt.precio_unidad, 0)     AS precio_unitario,
  ptt.cantidad_lleva * COALESCE(tt.precio_unidad, 0) AS subtotal
FROM prototipo_tipo_tablas ptt
JOIN tipo_tablas tt ON tt.id_tipo_tabla = ptt.id_tipo_tabla

UNION ALL
/* ====== TACOS ====== */
SELECT 
  ptk.id_prototipo,
  'taco'                            AS categoria,
  ptk.id_tipo_taco                  AS id_item,
  tk.titulo                         AS titulo,
  ptk.aclaraciones,
  ptk.cantidad_lleva                AS cantidad,
  COALESCE(tk.precio_unidad, 0)     AS precio_unitario,
  ptk.cantidad_lleva * COALESCE(tk.precio_unidad, 0) AS subtotal
FROM prototipo_tipo_tacos ptk
JOIN tipo_tacos tk ON tk.id_tipo_taco = ptk.id_tipo_taco

UNION ALL
/* ====== CLAVOS (precio desde materiaprima) ====== */
SELECT 
  pcl.id_prototipo,
  'clavo'                           AS categoria,
  pcl.id_materia_prima              AS id_item,
  mp.titulo                         AS titulo,
  pcl.aclaraciones,
  pcl.cantidad_lleva                AS cantidad,
  COALESCE(mp.precio_unidad, 0)     AS precio_unitario,
  pcl.cantidad_lleva * COALESCE(mp.precio_unidad, 0) AS subtotal
FROM prototipo_clavos pcl
JOIN materiaprima mp ON mp.id_materia_prima = pcl.id_materia_prima

UNION ALL
/* ====== FIBRAS (precio desde materiaprima) ====== */
SELECT 
  pf.id_prototipo,
  'fibra'                           AS categoria,
  pf.id_materia_prima               AS id_item,
  mp.titulo                         AS titulo,
  pf.aclaraciones,
  pf.cantidad_lleva                 AS cantidad,
  COALESCE(mp.precio_unidad, 0)     AS precio_unitario,
  pf.cantidad_lleva * COALESCE(mp.precio_unidad, 0) AS subtotal
FROM prototipo_fibras pf
JOIN materiaprima mp ON mp.id_materia_prima = pf.id_materia_prima

UNION ALL
/* ====== PATÍN (usa cantidad_patines del prototipo) ====== */
SELECT
  pp.id_prototipo,
  'patin'                           AS categoria,
  pp.id_tipo_patin                  AS id_item,
  tp.titulo                         AS titulo,
  NULL                              AS aclaraciones,
  COALESCE(pp.cantidad_patines, 0)  AS cantidad,
  COALESCE(tp.precio_unidad, 0)     AS precio_unitario,
  COALESCE(pp.cantidad_patines, 0) * COALESCE(tp.precio_unidad, 0) AS subtotal
FROM prototipo_pallet pp
JOIN tipo_patines tp ON tp.id_tipo_patin = pp.id_tipo_patin
WHERE pp.id_tipo_patin IS NOT NULL
  AND COALESCE(pp.cantidad_patines, 0) > 0;

-- ===========================================
-- 2) Costo total por prototipo (suma el BOM)
-- ===========================================
DROP VIEW IF EXISTS vw_prototipo_costo_total;
CREATE VIEW vw_prototipo_costo_total AS
SELECT 
  pp.id_prototipo,
  pp.titulo,
  pp.medidas,
  pp.id_cliente,
  COALESCE(SUM(bom.subtotal), 0) AS costo_materiales
FROM prototipo_pallet pp
LEFT JOIN vw_prototipo_bom_detalle bom
  ON bom.id_prototipo = pp.id_prototipo
GROUP BY
  pp.id_prototipo, pp.titulo, pp.medidas, pp.id_cliente;