// PedidoPDFInline.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Document, Text, Page, StyleSheet, Image, View } from "@react-pdf/renderer";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { api } from "../../api";

// ======================== Estilos del PDF ========================
const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  header: {
    borderBottom: "1px solid #ddd",
    paddingBottom: 8,
    marginBottom: 10,
  },
  h1: { fontSize: 18, fontWeight: 700 },
  h2: { fontSize: 13, marginTop: 10, marginBottom: 4, fontWeight: 700 },
  line: { borderBottom: "1px solid #eee", marginVertical: 8 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  label: { color: "#666" },
  value: { fontWeight: 700 },
  foto: { width: 220, height: 160, objectFit: "cover", borderRadius: 4, marginTop: 6 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  itemLeft: { flexDirection: "column" },
  itemTitle: { fontWeight: 700 },
  foot: { marginTop: 14, fontSize: 10, color: "#666" },
});


function PedidosPDF({ data }) {
  const p = data || {};
  const prot = p.prototipo || {};

  const fmt = (n) => (n ?? "") + "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.h1}>Pedido #{fmt(p.id_pedido) || "—"}</Text>
          <Text>{p.fecha ? `Fecha: ${p.fecha}` : ""}</Text>
        </View>

        {/* Cliente + Cantidad */}
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{p.cliente?.nombre || "—"}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Cantidad de pallets</Text>
            <Text style={styles.value}>{p.cantidad_pallets ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.line} />

        {/* Prototipo */}
        <Text style={styles.h2}>Prototipo</Text>
        <Text style={styles.value}>{prot.nombre || "—"}</Text>
        {prot.mesas_desc && <Text>{prot.mesas_desc}</Text>}

        {prot.foto_url ? <Image src={prot.foto_url} style={styles.foto} /> : null}

        {/* Medidas */}
        {(prot.medidas?.largo || prot.medidas?.ancho || prot.medidas?.alto) && (
          <>
            <Text style={styles.h2}>Medidas</Text>
            <Text>
              Largo: {prot.medidas?.largo ?? "—"} • Ancho: {prot.medidas?.ancho ?? "—"} • Alto:{" "}
              {prot.medidas?.alto ?? "—"}
            </Text>
          </>
        )}

        {/* Tablas */}
        {Array.isArray(prot.tablas) && prot.tablas.length > 0 && (
          <>
            <Text style={styles.h2}>Tablas</Text>
            {prot.tablas.map((t, i) => (
              <View key={`tab-${i}`} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle}>{t.tipo}</Text>
                  <Text>
                    {t.medidas?.largo ?? "—"}x{t.medidas?.ancho ?? "—"}x{t.medidas?.espesor ?? "—"}
                  </Text>
                </View>
                <Text>Cant: {t.cantidad ?? 0}</Text>
              </View>
            ))}
          </>
        )}

        {/* Tacos */}
        {Array.isArray(prot.tacos) && prot.tacos.length > 0 && (
          <>
            <Text style={styles.h2}>Tacos</Text>
            {prot.tacos.map((t, i) => (
              <View key={`tac-${i}`} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemTitle}>{t.tipo}</Text>
                  <Text>
                    {t.medidas?.l ?? "—"}x{t.medidas?.a ?? "—"}x{t.medidas?.h ?? "—"}
                  </Text>
                </View>
                <Text>Cant: {t.cantidad ?? 0}</Text>
              </View>
            ))}
          </>
        )}

        {/* Patines */}
        {Array.isArray(prot.patines) && prot.patines.length > 0 && (
          <>
            <Text style={styles.h2}>Patines</Text>
            {prot.patines.map((p, i) => (
              <View key={`pat-${i}`} style={styles.itemRow}>
                <Text style={styles.itemTitle}>{p.tipo}</Text>
                <Text>Cant: {p.cantidad ?? 0}</Text>
              </View>
            ))}
          </>
        )}

        {/* Clavos */}
        {Array.isArray(prot.clavos) && prot.clavos.length > 0 && (
          <>
            <Text style={styles.h2}>Clavos</Text>
            {prot.clavos.map((c, i) => (
              <View key={`cla-${i}`} style={styles.itemRow}>
                <Text style={styles.itemTitle}>{c.tipo}</Text>
                <Text>
                  {c.medida ? `Medida: ${c.medida} • ` : ""}Cant: {c.cantidad ?? 0}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Observaciones */}
        {p.observaciones ? (
          <>
            <Text style={styles.h2}>Observaciones</Text>
            <Text>{p.observaciones}</Text>
          </>
        ) : null}

        <Text style={styles.foot}>Generado automáticamente • Imanod</Text>
      </Page>
    </Document>
  );
}

// ================== Contenedor que arma todo y descarga ==================
export default function PedidoPDFInline({ pedido }) {
  const [loading, setLoading] = useState(false);
  const [proto, setProto] = useState(null);
  const [err, setErr] = useState("");

  const idPrototipo = pedido?.id_prototipo || pedido?.prototipo?.id_prototipo;

  useEffect(() => {
    if (!idPrototipo) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr("");
        const { data } = await api.get(`/prototipos/${idPrototipo}`);
        if (!alive) return;
        setProto(data);
      } catch (e) {
        if (!alive) return;
        setErr("No se pudo cargar el prototipo.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [idPrototipo]);

  // Mapea el prototipo a lo que el PDF espera
  const pdfData = useMemo(() => {
    if (!proto) return null;

    const bom = Array.isArray(proto.bom_detalle) ? proto.bom_detalle : [];
    const porCat = (cat) => bom.filter((x) => x.categoria === cat);

    const tablas = porCat("tabla").map((t) => ({
      tipo: t.titulo,
      medidas: {
        largo: t.largo ?? t.med_largo,
        ancho: t.ancho ?? t.med_ancho,
        espesor: t.espesor ?? t.med_espesor,
      },
      cantidad: t.cantidad ?? 0,
    }));

    const tacos = porCat("taco").map((t) => ({
      tipo: t.titulo,
      medidas: { l: t.largo, a: t.ancho, h: t.alto },
      cantidad: t.cantidad ?? 0,
    }));

    const patines = porCat("patin").map((p) => ({
      tipo: p.titulo,
      cantidad: p.cantidad ?? 0,
      descripcion: p.aclaraciones || "",
    }));

    const clavos = porCat("clavo").map((c) => ({
      tipo: c.titulo,
      medida: c.medida || c.aclaraciones || "",
      cantidad: c.cantidad ?? 0,
    }));

    return {
      id_pedido: pedido?.id_pedido,
      fecha: pedido?.fecha,
      cantidad_pallets: pedido?.cantidad_pallets,
      observaciones: pedido?.observaciones || "",
      cliente: {
        nombre:
          pedido?.cliente_nombre ||
          pedido?.cliente?.nombre ||
          pedido?.cliente_empresa ||
          "",
      },
      prototipo: {
        nombre: proto?.titulo || proto?.nombre || `Prototipo #${proto?.id_prototipo}`,
        foto_url: proto?.foto_url || proto?.foto || null,
        medidas: proto?.medidas
          ? {
              largo: proto.medidas.split("x")[0],
              ancho: proto.medidas.split("x")[1],
              alto: proto.medidas.split("x")[2],
            }
          : { largo: proto?.largo, ancho: proto?.ancho, alto: proto?.alto },
        tablas,
        tacos,
        patines,
        clavos,
      },
    };
  }, [proto, pedido]);

  if (!idPrototipo) {
    return <button disabled className="px-3 py-2 bg-gray-300 rounded">Sin prototipo</button>;
  }
  if (err) return <span className="text-sm text-red-600">{err}</span>;

  return (
    <PDFDownloadLink
    document={<PedidosPDF data={pdfData || {}} />}
    fileName={`pedido_${pedido?.id_pedido || "sin-id"}.pdf`}
    className="px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-800 text-white"
    >
    {({ loading }) => (loading ? "Generando…" : "🧾 PDF")}
    </PDFDownloadLink>
  );
}
