show databases
use tesisdb
show tables

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
    id_proveedor INT,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id_proveedor)
);

CREATE TABLE encargo_detalles (
    id_encargo_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_encargo INT NOT NULL,
    tipo_producto ENUM('tabla', 'palo', 'clavo', 'fibra') NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (id_encargo) REFERENCES encargos(id_encargo)
);

CREATE TABLE tablas (
    id_tabla INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    largo FLOAT,
    ancho FLOAT,
    espesor FLOAT,
    tipo_madera VARCHAR(50),
    cepilladas BOOLEAN,
    precio_unidad FLOAT,
    stock INT,
    foto VARCHAR(255),
    comentarios VARCHAR(255)
);

CREATE TABLE palos (
    id_palo INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    largo FLOAT,
    ancho FLOAT,
    tipo_madera VARCHAR(50),
    precio_unidad FLOAT,
    stock INT,
    foto VARCHAR(255),
    comentarios VARCHAR(255)
);

CREATE TABLE clavos (
    id_clavo INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    tipo VARCHAR(50),
    medidas VARCHAR(50),
    precio_unidad FLOAT,
    stock INT,
    foto VARCHAR(255),
    comentarios VARCHAR(255)
);

CREATE TABLE fibras (
    id_fibra INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    ancho FLOAT,
    largo FLOAT,
    precio_unidad FLOAT,
    stock INT,
    foto VARCHAR(255),
    comentarios VARCHAR(255)
);

CREATE TABLE tipo_tablas (
	id_tipo_tabla INT AUTO_INCREMENT PRIMARY KEY,
	titulo VARCHAR(100),
    largo FLOAT,
    ancho FLOAT,
    espesor FLOAT,
    foto VARCHAR(255),
    precio_unidad FLOAT,
    cepillada BOOLEAN,
    stock INT DEFAULT 0,
    id_tabla INT,
    FOREIGN KEY (id_tabla) REFERENCES tablas(id_tabla)
);
    
CREATE TABLE tipo_tacos (
    id_tipo_taco INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    medidas VARCHAR(100),
    stock INT DEFAULT 0,
    precio_unidad FLOAT,
    logo VARCHAR(255),
    foto VARCHAR(255),
    id_palo INT,
    FOREIGN KEY (id_palo) REFERENCES palos(id_palo)
);

CREATE TABLE tipo_patines (
    id_tipo_patin INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    medidas VARCHAR(100),
    logo VARCHAR(255),
    id_tipo_tabla INT,
	id_tipo_taco INT,
    precio_unidad FLOAT,
    comentarios VARCHAR(255),
    FOREIGN KEY (id_tipo_tabla) REFERENCES tablas(id_tabla),
	FOREIGN KEY (id_tipo_taco) REFERENCES tipo_tacos(id_tipo_taco)
);

CREATE TABLE prototipo_pallet (
    id_prototipo INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    medidas VARCHAR(100),
    id_tipo_patin INT,
    id_tipo_taco INT,
    precio_unidad FLOAT,
    comentarios VARCHAR(255),
    id_cliente INT,
    FOREIGN KEY (id_tipo_patin) REFERENCES tipo_patines(id_tipo_patin),
    FOREIGN KEY (id_tipo_taco) REFERENCES tipo_tacos(id_tipo_taco),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),

    -- Campos para empresa (pueden ser NULL si es cliente común)
    es_empresa BOOLEAN DEFAULT FALSE,
    nombre_empresa VARCHAR(100),
    direccion_empresa VARCHAR(255),
    email_empresa VARCHAR(100)
);

CREATE TABLE prototipo_tipo_tablas (
    id_prototipo INT,
    id_tabla INT,
    cantidad_lleva INT,
    PRIMARY KEY (id_prototipo, id_tabla),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_tabla) REFERENCES tablas(id_tabla)
);

CREATE TABLE prototipo_tipo_tacos (
    id_prototipo INT,
    id_tipo_taco INT,
    cantidad_lleva INT,
    PRIMARY KEY (id_prototipo, id_tipo_taco),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_tipo_taco) REFERENCES tipo_tacos(id_tipo_taco)
);

CREATE TABLE prototipo_clavos (
    id_prototipo INT,
    id_clavo INT,
    cantidad_lleva INT,
    PRIMARY KEY (id_prototipo, id_clavo),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_clavo) REFERENCES clavos(id_clavo)
);

CREATE TABLE prototipo_fibras (
    id_prototipo INT,
    id_fibra INT,
    cantidad_lleva INT,
    PRIMARY KEY (id_prototipo, id_fibra),
    FOREIGN KEY (id_prototipo) REFERENCES prototipo_pallet(id_prototipo),
    FOREIGN KEY (id_fibra) REFERENCES fibras(id_fibra)
);

CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT,
    estado ENUM('pendiente', 'en_produccion', 'listo', 'entregado', 'cancelado') DEFAULT 'pendiente',
    fecha_realizado DATE,
    fecha_de_entrega DATE,
    precio_total FLOAT,
    comentarios VARCHAR(255),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE pedido_prototipo_pallet (
    id_pedido INT,
    id_prototipo INT,
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
    fecha_cargado DATE,
    fecha_entrega DATE,
    comentarios VARCHAR(255),
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
);

CREATE TABLE ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    fecha_realizada DATE NOT NULL,
    precio_total FLOAT NOT NULL,
    id_cliente INT,
    foto VARCHAR(255),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
);

CREATE TABLE fuego_ya (
    id_fuego_ya INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(100),
    precio_unidad FLOAT,
    stock INT,
    foto VARCHAR(255)
);

CREATE TABLE pellets (
    id_pellet INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    bolsa_kilogramos FLOAT,
    precio_unidad FLOAT,
    stock INT,
    foto VARCHAR(255)
);


/*INSERCIONES*/

/*## PROVEEDORES##*/
INSERT INTO proveedores (nombre, nombre_empresa, telefono, correo_electronico, comentarios)
VALUES 
('Juan Pérez', 'Maderas del Sur', '+59899112233', 'juan.perez@maderasur.com', 'Entrega puntual y buena calidad'),
('María López', 'Ferretería López', '+59899223344', 'maria.lopez@ferrelopez.com', 'Clavos y herramientas variadas');

/*##TABLAS##*/
INSERT INTO tablas (titulo, largo, ancho, espesor, tipo_madera, cepilladas, precio_unidad, stock, foto, comentarios)
VALUES 
('Tabla Pino 2x4', 2.0, 4.0, 0.5, 'Pino', TRUE, 12.5, 100, 'tabla_pino.jpg', 'Muy solicitadas para pallets'),
('Tabla Pino 2x4', 2.0, 4.0, 0.5, 'Pino', TRUE, 12.5, 100, 'tabla_pino.jpg', 'Muy usadas en pallets estándar'),
('Tabla Roble 3x6', 3.0, 6.0, 0.75, 'Roble', TRUE, 20.0, 50, 'tabla_roble.jpg', 'Alta resistencia y durabilidad'),
('Tabla Cedro 1x2', 1.0, 2.0, 0.25, 'Cedro', FALSE, 8.0, 200, 'tabla_cedro.jpg', 'Ideal para terminaciones delicadas');

/*##PALOS##*/
INSERT INTO palos (titulo, largo, ancho, tipo_madera, precio_unidad, stock, foto, comentarios)
VALUES ('Palo de Eucalipto', 3.0, 0.5, 'Eucalipto', 5.0, 200, 'palo_eucalipto.jpg', 'Resistentes y económicos'),
('Palo de Eucalipto', 3.0, 0.5, 'Eucalipto', 5.0, 200, 'palo_eucalipto.jpg', 'Económico y duradero'),
('Palo de Pino', 2.5, 0.4, 'Pino', 4.5, 150, 'palo_pino.jpg', 'Ligero y fácil de manejar'),
('Palo de Roble', 3.5, 0.6, 'Roble', 7.0, 80, 'palo_roble.jpg', 'Alta calidad y resistencia');

/*##CLAVOS##*/
INSERT INTO clavos (titulo, tipo, medidas, precio_unidad, stock, foto, comentarios)
VALUES ('Clavo estándar', 'Hierro', '2 pulgadas', 0.02, 1000, 'clavo_estandar.jpg', 'Resistente a oxidación'),
('Clavo estándar 2"', 'Hierro', '2 pulgadas', 0.02, 1000, 'clavo_2p.jpg', 'Uso general y pallets'),
('Clavo reforzado 3"', 'Acero', '3 pulgadas', 0.04, 800, 'clavo_3p.jpg', 'Mayor resistencia para pallets'),
('Clavo inoxidable 1.5"', 'Acero inoxidable', '1.5 pulgadas', 0.05, 500, 'clavo_inox.jpg', 'Resistente a humedad y corrosión');

/*##FIBRAS##*/
INSERT INTO fibras (titulo, ancho, largo, precio_unidad, stock, foto, comentarios)
VALUES ('Fibra natural', 1.2, 2.4, 15.0, 50, 'fibra_natural.jpg', 'Ideal para embalajes delicados'),
('Fibra Natural estándar', 1.2, 2.4, 15.0, 60, 'fibra_estandar.jpg', 'Buena calidad para protección'),
('Fibra Sintética reforzada', 1.5, 3.0, 18.0, 40, 'fibra_reforzada.jpg', 'Alta resistencia mecánica'),
('Fibra reciclada ecológica', 1.0, 2.0, 12.0, 80, 'fibra_ecologica.jpg', 'Eco-friendly y económica');

/*##ENCARGOS##*/
INSERT INTO encargos (fecha_realizado, fecha_prevista_llegada, comentarios, id_proveedor)
VALUES ('2025-06-22', '2025-06-29', 'Encargo variado mensual', 1);

/*##ENCARGOS DETALLES##*/
INSERT INTO encargo_detalles (id_encargo, tipo_producto, id_producto, cantidad)
VALUES
    (1, 'tabla', 1, 40),
    (1, 'tabla', 2, 20),
    (1, 'palo', 1, 50),
    (1, 'palo', 2, 30),
    (1, 'clavo', 1, 600),
    (1, 'fibra', 2, 15);


/*SELECT PARA TRAER UN ENCARGO POR SU ID Y TODOS LOS MATERIALES QUE LO COMPONEN*/
SELECT ed.*, t.titulo AS nombre_producto, 'tabla' AS categoria
FROM encargo_detalles ed
JOIN tablas t ON ed.id_producto = t.id_tabla
WHERE ed.id_encargo = 1 AND ed.tipo_producto = 'tabla'

UNION ALL

SELECT ed.*, p.titulo AS nombre_producto, 'palo' AS categoria
FROM encargo_detalles ed
JOIN palos p ON ed.id_producto = p.id_palo
WHERE ed.id_encargo = 1 AND ed.tipo_producto = 'palo'

UNION ALL

SELECT ed.*, c.titulo AS nombre_producto, 'clavo' AS categoria
FROM encargo_detalles ed
JOIN clavos c ON ed.id_producto = c.id_clavo
WHERE ed.id_encargo = 1 AND ed.tipo_producto = 'clavo'

UNION ALL

SELECT ed.*, f.titulo AS nombre_producto, 'fibra' AS categoria
FROM encargo_detalles ed
JOIN fibras f ON ed.id_producto = f.id_fibra
WHERE ed.id_encargo = 1 AND ed.tipo_producto = 'fibra';