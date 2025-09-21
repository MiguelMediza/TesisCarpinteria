import React, { useEffect, useMemo, useState } from "react";
import {
  Document, Text, Page, StyleSheet, Image, View, PDFDownloadLink,
} from "@react-pdf/renderer";
import logoImanod from "../../assets/logoImanod.png";


import { normalizeCdnUrl, getProxyUrl, fetchAsJpegDataUrl } from "../../utils/pdfImage";

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("es-UY") : "");

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, fontFamily: "Helvetica" },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  header: { borderBottom: "1px solid #ddd", paddingBottom: 8, marginBottom: 10 },
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
  logo: { width: 80, objectFit: "contain" },
});

function PedidosPDF({ data }) {
  const p = data || {};
  const prot = p.prototipo || {};
  const cantPallets = Number(p.cantidad_pallets || 0);
  const fmt = (x) => (x ?? "") + "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerTop}>
          <Image src={logoImanod} style={styles.logo} />
        </View>

        <View style={styles.header}>
          <Text style={styles.h1}>Pedido #{fmt(p.id_pedido) || "—"}</Text>
          <Text>Fecha realizado: {p.fecha_realizado_str || "—"}</Text>
          {!!p.fecha_entrega_str && <Text>Fecha de entrega: {p.fecha_entrega_str}</Text>}
        </View>

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

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Nº de tratamiento</Text>
            <Text style={styles.value}>{p.numero_tratamiento || "sin especificar"}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Nº de lote</Text>
            <Text style={styles.value}>{p.numero_lote || "sin especificar"}</Text>
          </View>
        </View>

        <View style={styles.line} />

        <Text style={styles.h2}>Prototipo</Text>
        <Text style={styles.value}>{prot.nombre || "—"}</Text>
        {prot.foto_url ? <Image src={prot.foto_url} style={styles.foto} /> : null}

        {(prot.medidas?.largo || prot.medidas?.ancho || prot.medidas?.alto) && (
          <>
            <Text style={styles.h2}>Medidas</Text>
            <Text>
              Largo: {prot.medidas?.largo ?? "—"} • Ancho: {prot.medidas?.ancho ?? "—"}
              {prot.medidas?.alto ? ` • Alto: ${prot.medidas.alto}` : ""}
            </Text>
          </>
        )}

        {Array.isArray(prot.tablas) && prot.tablas.length > 0 && (
          <>
            <Text style={styles.h2}>Tablas</Text>
            {prot.tablas.map((t, i) => {
              const porPallet = Number(t.cantidad || 0);
              const total = cantPallets > 0 ? porPallet * cantPallets : null;
              return (
                <View key={`tab-${i}`} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemTitle}>{t.tipo}</Text>
                    <Text>
                      {t.medidas?.largo ?? "—"}x{t.medidas?.ancho ?? "—"}x{t.medidas?.espesor ?? "—"}
                    </Text>
                  </View>
                  <Text>
                    Cant/pallet: {porPallet}
                    {total !== null ? `  •  Total: ${porPallet} × ${cantPallets} = ${total}` : ""}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {Array.isArray(prot.tacos) && prot.tacos.length > 0 && (
          <>
            <Text style={styles.h2}>Tacos</Text>
            {prot.tacos.map((t, i) => {
              const porPallet = Number(t.cantidad || 0);
              const total = cantPallets > 0 ? porPallet * cantPallets : null;
              return (
                <View key={`tac-${i}`} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemTitle}>{t.tipo}</Text>
                    <Text>
                      {t.medidas?.l ?? "—"}x{t.medidas?.a ?? "—"}x{t.medidas?.h ?? "—"}
                    </Text>
                  </View>
                  <Text>
                    Cant/pallet: {porPallet}
                    {total !== null ? `  •  Total: ${porPallet} × ${cantPallets} = ${total}` : ""}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {Array.isArray(prot.patines) && prot.patines.length > 0 && (
          <>
            <Text style={styles.h2}>Patines</Text>
            {prot.patines.map((pp, i) => {
              const porPallet = Number(pp.cantidad || 0);
              const total = cantPallets > 0 ? porPallet * cantPallets : null;
              return (
                <View key={`pat-${i}`} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{pp.tipo}</Text>
                  <Text>
                    Cant/pallet: {porPallet}
                    {total !== null ? `  •  Total: ${porPallet} × ${cantPallets} = ${total}` : ""}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {Array.isArray(prot.clavos) && prot.clavos.length > 0 && (
          <>
            <Text style={styles.h2}>Clavos</Text>
            {prot.clavos.map((c, i) => {
              const porPallet = Number(c.cantidad || 0);
              const total = cantPallets > 0 ? porPallet * cantPallets : null;
              return (
                <View key={`cla-${i}`} style={styles.itemRow}>
                  <Text style={styles.itemTitle}>{c.tipo}</Text>
                  <Text>
                    {c.medida ? `Medida: ${c.medida} • ` : ""}
                    Cant/pallet: {porPallet}
                    {total !== null ? `  •  Total: ${porPallet} × ${cantPallets} = ${total}` : ""}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {!!p.observaciones && (
          <>
            <Text style={styles.h2}>Observaciones</Text>
            <Text>{p.observaciones}</Text>
          </>
        )}

        <Text style={styles.foot}>Generado automáticamente • Imanod</Text>
      </Page>
    </Document>
  );
}

export default function PedidoPDFInline({ pedido }) {
  const [proto, setProto] = useState(null);
  const [protoFotoDataUrl, setProtoFotoDataUrl] = useState(null);
  const [err, setErr] = useState("");

  const firstItem = Array.isArray(pedido?.items) ? pedido.items[0] : null;

  const idPrototipo =
    pedido?.id_prototipo ||
    pedido?.prototipo?.id_prototipo ||
    firstItem?.id_prototipo ||
    null;

  useEffect(() => {
    if (!idPrototipo) return;
    let alive = true;
    (async () => {
      try {
        setErr("");
        const resp = await fetch(`/api/src/prototipos/${idPrototipo}`, { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!alive) return;
        setProto(json);
      } catch (e) {
        if (!alive) return;
        setErr("No se pudo cargar el prototipo.");
      }
    })();
    return () => { alive = false; };
  }, [idPrototipo]);

  const rawFoto = firstItem?.prototipo_foto || proto?.foto_url || proto?.foto || null;

  const cdnAbs = useMemo(() => (rawFoto ? normalizeCdnUrl(rawFoto) : null), [rawFoto]);
  const proxiedFoto = useMemo(() => (cdnAbs ? getProxyUrl(cdnAbs) : null), [cdnAbs]);

  useEffect(() => {
    let alive = true;
    setProtoFotoDataUrl(null);
    (async () => {
      if (!proxiedFoto) return;
      try {
        const dataUrl = await fetchAsJpegDataUrl(proxiedFoto);
        if (!alive) return;
        setProtoFotoDataUrl(dataUrl);
      } catch {
        if (!alive) return;
        setProtoFotoDataUrl(null);
      }
    })();
    return () => { alive = false; };
  }, [proxiedFoto]);

  const pdfData = useMemo(() => {
    if (!proto) return null;

    const bom = Array.isArray(proto.bom_detalle) ? proto.bom_detalle : [];
    const by = (cat) => bom.filter((x) => x.categoria === cat);

    const tablas = by("tabla").map((t) => ({
      tipo: t.titulo,
      medidas: { largo: t.largo ?? t.med_largo, ancho: t.ancho ?? t.med_ancho, espesor: t.espesor ?? t.med_espesor },
      cantidad: t.cantidad ?? 0,
    }));

    const tacos = by("taco").map((t) => ({
      tipo: t.titulo,
      medidas: { l: t.largo, a: t.ancho, h: t.alto },
      cantidad: t.cantidad ?? 0,
    }));

    const patines = by("patin").map((p) => ({ tipo: p.titulo, cantidad: p.cantidad ?? 0 }));

    const clavos = by("clavo").map((c) => ({
      tipo: c.titulo,
      medida: c.medida || c.aclaraciones || "",
      cantidad: c.cantidad ?? 0,
    }));

    const numeroTratamiento =
      pedido?.numero_tratamiento ??
      firstItem?.numero_tratamiento ??
      "";

  const numeroLote =
    pedido?.numero_lote ??
    firstItem?.numero_lote ??
    "";
    const fechaReal = fmtDate(pedido?.fecha_realizado);
    const fechaEntrega = fmtDate(pedido?.fecha_de_entrega);

    const cantidadPallets = pedido?.cantidad_pallets ?? firstItem?.cantidad_pallets ?? null;

    const clienteNombre =
      pedido?.cliente_display ||
      pedido?.cliente_empresa ||
      [pedido?.cliente_nombre, pedido?.cliente_apellido].filter(Boolean).join(" ") ||
      "";
    const medidas =
      proto?.medidas && typeof proto.medidas === "string"
        ? (() => {
            const [l, a, h] = proto.medidas.split("x");
            return { largo: l, ancho: a, alto: h };
          })()
        : { largo: proto?.largo, ancho: proto?.ancho, alto: proto?.alto };

    return {
      id_pedido: pedido?.id_pedido,
      fecha_realizado_str: fechaReal,
      fecha_entrega_str: fechaEntrega,
      cantidad_pallets: cantidadPallets,
      observaciones: (pedido?.comentarios || "").toString(),
      numero_tratamiento: numeroTratamiento,
      numero_lote: numeroLote,
      cliente: { nombre: clienteNombre },
      prototipo: {
        nombre: proto?.titulo || proto?.nombre || `Prototipo #${proto?.id_prototipo}`,
        foto_url: protoFotoDataUrl || null, 
        medidas,
        tablas,
        tacos,
        patines,
        clavos,
      },
    };
  }, [proto, pedido, firstItem, protoFotoDataUrl]);

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
