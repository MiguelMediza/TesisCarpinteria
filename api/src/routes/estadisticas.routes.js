import { Router } from "express";
import { pool } from "../db.js"; 

const router = Router();

router.get("/top-meses", async (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit || "6", 10));
  const months = Math.max(1, parseInt(req.query.months || "12", 10));

  const sql = `
     WITH pedidos_entregados AS (
      SELECT
        p.id_pedido,
        COALESCE(
          p.fecha_de_entrega,
          (SELECT MIN(et.fecha_entrega) FROM entregas_transporte et WHERE et.id_pedido = p.id_pedido)
        ) AS fecha_entrega_efectiva,
        p.precio_total
      FROM pedidos p
      WHERE p.estado = 'entregado' AND p.eliminado = FALSE
    ),
    unificado AS (
      -- Pedidos entregados
      SELECT
        DATE_FORMAT(pe.fecha_entrega_efectiva, '%Y-%m') AS ym,
        STR_TO_DATE(CONCAT(DATE_FORMAT(pe.fecha_entrega_efectiva, '%Y-%m'), '-01'), '%Y-%m-%d') AS month_start,
        1 AS pedidos_entregados,
        0 AS ventas_count,
        0 AS fuegoya_count,
        COALESCE(pe.precio_total, 0) AS total,
        0 AS recibido              -- pedidos entregados: no suman a "recibido" en esta métrica
      FROM pedidos_entregados pe

      UNION ALL
      -- Ventas
      SELECT
        DATE_FORMAT(v.fecha_realizada, '%Y-%m') AS ym,
        STR_TO_DATE(CONCAT(DATE_FORMAT(v.fecha_realizada, '%Y-%m'), '-01'), '%Y-%m-%d') AS month_start,
        0, 1, 0,
        COALESCE(v.precio_total, 0),
        0                       -- ventas estándar: no entran en "recibido" (solo fuegoya pagado)
      FROM ventas v

      UNION ALL
      -- Ventas FuegoYa (incluye si está pago o no)
      SELECT
        DATE_FORMAT(vf.fecha_realizada, '%Y-%m') AS ym,
        STR_TO_DATE(CONCAT(DATE_FORMAT(vf.fecha_realizada, '%Y-%m'), '-01'), '%Y-%m-%d') AS month_start,
        0, 0, 1,
        COALESCE(vf.precio_total, 0),
        CASE WHEN vf.estadopago = 'pago' THEN COALESCE(vf.precio_total, 0) ELSE 0 END AS recibido
      FROM venta_fuegoya vf
    )
    SELECT
      ym,
      DATE_FORMAT(month_start, '%b %Y') AS mes_label,
      SUM(pedidos_entregados) AS pedidos_entregados,
      SUM(ventas_count)       AS ventas,
      SUM(fuegoya_count)      AS ventas_fuegoya,
      SUM(total)              AS total_recaudado,
      SUM(recibido)           AS total_recibido
    FROM unificado
    WHERE month_start >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL ? - 1 MONTH), '%Y-%m-01')
    GROUP BY ym, mes_label
    ORDER BY total_recaudado DESC
    LIMIT ?;
  `;

  try {
    const [rows] = await pool.query(sql, [months, limit]);
    res.json(rows);
  } catch (err) {
    console.error("top-meses error:", err);
    res.status(500).json({ error: "No se pudieron calcular las estadísticas." });
  }
});

export default router;
