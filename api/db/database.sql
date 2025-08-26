create database tesisdb;
use tesisdb;
show tables;

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
    fecha_realizado   DATE,
    fecha_de_entrega  DATE,
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

CREATE TABLE pellets (
    id_pellet INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100),
    bolsa_kilogramos FLOAT,
    precio_unidad DECIMAL(10,2),
    stock INT,
    foto VARCHAR(255)
);