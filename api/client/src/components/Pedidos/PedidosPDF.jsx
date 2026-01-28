import React, { useEffect, useMemo, useState } from "react";
import {
  Document,
  Text,
  Page,
  StyleSheet,
  Image,
  View,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import logoImanod from "../../assets/logoImanod.png";

import {
  normalizeCdnUrl,
  getProxyUrl,
  fetchAsJpegDataUrl,
} from "../../utils/pdfImage";

const fmtDate = (s) =>
  s ? new Date(s).toLocaleDateString("es-UY") : "";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleBlock: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
  },
  h1: {
    fontSize: 18,
    fontWeight: 700,
  },
  small: {
    fontSize: 10,
  },
  line: {
    borderBottom: "1px solid #ddd",
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },
  label: {
    color: "#666",
  },
  bold: {
    fontWeight: 700,
  },
  foto: {
    width: 220,
    height: 160,
    objectFit: "cover",
    borderRadius: 4,
    marginVertical: 6,
  },
  foot: {
    marginTop: 14,
    fontSize: 9,
    color: "#666",
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: "contain",
  },
});

/* ======================= DOCUMENTO PDF ======================= */

function PedidosPDF({ data }) {
  const p = data || {};
  const items = Array.isArray(p.items) ? p.items : [];

  const totPallets = items.reduce(
    (acc, it) => acc + Number(it.cantidad_pallets || 0),
    0
  );
  const totDesdeStock = items.reduce(
    (acc, it) => acc + Number(it.cantidad_desde_stock || 0),
    0
  );
  const totAProducir = items.reduce(
    (acc, it) => acc + Number(it.cantidad_a_producir || 0),
    0
  );

  let modoAbastecimiento = "Sólo producción";
  if (totDesdeStock > 0 && totAProducir > 0)
    modoAbastecimiento = "Mixto: stock + producción";
  else if (totDesdeStock > 0 && totAProducir === 0)
    modoAbastecimiento = "Sólo desde stock";

  const renderItem = (it, idx) => {
    const prot = it.prototipo || {};
    const cant = Number(it.cantidad_pallets || 0);
    const desdeStock = Number(it.cantidad_desde_stock || 0);
    const aProducir = Number(it.cantidad_a_producir || 0);

    return (
      <View key={idx}>
        <View style={styles.line} />
        <Text style={styles.sectionTitle}>
          Ítem {idx + 1} –{" "}
          {prot.nombre ||
            it.prototipo_titulo ||
            `Prototipo #${it.id_prototipo}`}
        </Text>

        <Text>
          <Text style={styles.label}>Cantidad total: </Text>
          <Text style={styles.bold}>{cant} pallets</Text>
        </Text>
        <Text>
          <Text style={styles.label}>Desde stock: </Text>
          <Text style={styles.bold}>{desdeStock} pallets</Text>
        </Text>
        <Text>
          <Text style={styles.label}>A producir: </Text>
          <Text style={styles.bold}>{aProducir} pallets</Text>
        </Text>

        <Text>
          <Text style={styles.label}>Nº tratamiento: </Text>
          <Text style={styles.bold}>
            {it.numero_tratamiento || "sin especificar"}
          </Text>
        </Text>
        <Text>
          <Text style={styles.label}>Nº lote: </Text>
          <Text style={styles.bold}>
            {it.numero_lote || "sin especificar"}
          </Text>
        </Text>

        {it.comentarios && it.comentarios.toString().trim() && (
          <Text style={{ marginTop: 4 }}>
            <Text style={styles.label}>Comentarios del ítem: </Text>
            <Text>{it.comentarios}</Text>
          </Text>
        )}

        {prot.foto_url && (
          <Image src={prot.foto_url} style={styles.foto} />
        )}

        {prot.medidas &&
          (prot.medidas.largo ||
            prot.medidas.ancho ||
            prot.medidas.alto) && (
            <>
              <Text style={styles.sectionTitle}>Medidas</Text>
              <Text>
                Largo: {prot.medidas.largo ?? "—"} • Ancho:{" "}
                {prot.medidas.ancho ?? "—"}
                {prot.medidas.alto
                  ? ` • Alto: ${prot.medidas.alto}`
                  : ""}
              </Text>
            </>
          )}

        {Array.isArray(prot.tablas) &&
          prot.tablas.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tablas</Text>
              {prot.tablas.map((t, i2) => {
                const porPallet = Number(t.cantidad || 0);
                const totPedido = porPallet * cant;
                const totProd = porPallet * aProducir;
                return (
                  <Text key={`tab-${idx}-${i2}`}>
                    {t.tipo} – {t.medidas?.largo ?? "—"}x
                    {t.medidas?.ancho ?? "—"}x
                    {t.medidas?.espesor ?? "—"} • Cant/pallet:{" "}
                    {porPallet} • Total pedido: {totPedido}
                    {aProducir > 0
                      ? ` • A producir: ${totProd}`
                      : ""}
                  </Text>
                );
              })}
            </>
          )}

        {Array.isArray(prot.tacos) &&
          prot.tacos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tacos</Text>
              {prot.tacos.map((t, i2) => {
                const porPallet = Number(t.cantidad || 0);
                const totPedido = porPallet * cant;
                const totProd = porPallet * aProducir;
                return (
                  <Text key={`tac-${idx}-${i2}`}>
                    {t.tipo} – {t.medidas?.l ?? "—"}x
                    {t.medidas?.a ?? "—"}x
                    {t.medidas?.h ?? "—"} • Cant/pallet:{" "}
                    {porPallet} • Total pedido: {totPedido}
                    {aProducir > 0
                      ? ` • A producir: ${totProd}`
                      : ""}
                  </Text>
                );
              })}
            </>
          )}

        {Array.isArray(prot.patines) &&
          prot.patines.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Patines</Text>
              {prot.patines.map((pp, i2) => {
                const porPallet = Number(pp.cantidad || 0);
                const totPedido = porPallet * cant;
                const totProd = porPallet * aProducir;
                return (
                  <Text key={`pat-${idx}-${i2}`}>
                    {pp.tipo} • Cant/pallet: {porPallet} • Total
                    pedido: {totPedido}
                    {aProducir > 0
                      ? ` • A producir: ${totProd}`
                      : ""}
                  </Text>
                );
              })}
            </>
          )}

        {Array.isArray(prot.clavos) &&
          prot.clavos.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Clavos</Text>
              {prot.clavos.map((c, i2) => {
                const porPallet = Number(c.cantidad || 0);
                const totPedido = porPallet * cant;
                const totProd = porPallet * aProducir;
                return (
                  <Text key={`cla-${idx}-${i2}`}>
                    {c.tipo}
                    {c.medida ? ` – Medida: ${c.medida}` : ""} •
                    Cant/pallet: {porPallet} • Total pedido:{" "}
                    {totPedido}
                    {aProducir > 0
                      ? ` • A producir: ${totProd}`
                      : ""}
                  </Text>
                );
              })}
            </>
          )}
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Image src={logoImanod} style={styles.logo} />
          <View style={styles.titleBlock}>
            <Text style={styles.h1}>
              Pedido #{(p.id_pedido ?? "").toString() || "—"}
            </Text>
            <Text style={styles.small}>
              Fecha realizado: {p.fecha_realizado_str || "—"}
            </Text>
            {!!p.fecha_entrega_str && (
              <Text style={styles.small}>
                Fecha de entrega: {p.fecha_entrega_str}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.line} />

        <Text>
          <Text style={styles.label}>Cliente: </Text>
          <Text style={styles.bold}>
            {p.cliente?.nombre || "—"}
          </Text>
        </Text>
        <Text>
          <Text style={styles.label}>
            Cantidad total de pallets:{" "}
          </Text>
          <Text style={styles.bold}>{totPallets}</Text>
        </Text>
        <Text>
          <Text style={styles.label}>
            Desde stock existente:{" "}
          </Text>
          <Text style={styles.bold}>{totDesdeStock}</Text>
        </Text>
        <Text>
          <Text style={styles.label}>A producir: </Text>
          <Text style={styles.bold}>{totAProducir}</Text>
        </Text>
        <Text style={{ marginTop: 4 }}>
          <Text style={styles.label}>
            Modo de abastecimiento:{" "}
          </Text>
          <Text style={styles.bold}>{modoAbastecimiento}</Text>
        </Text>

        {p.observaciones &&
          p.observaciones.toString().trim() && (
            <>
              <View style={styles.line} />
              <Text style={styles.sectionTitle}>
                Observaciones del pedido
              </Text>
              <Text>{p.observaciones}</Text>
            </>
          )}

        {items[0] && renderItem(items[0], 0)}

        <Text style={styles.foot}>
          Generado automáticamente • Imanod
        </Text>
      </Page>

      {items.slice(1).map((it, idx) => (
        <Page key={idx + 1} size="A4" style={styles.page}>
          <Text style={styles.h1}>
            Pedido #{(p.id_pedido ?? "").toString() || "—"} – Ítem{" "}
            {idx + 2}
          </Text>
          <Text style={styles.small}>
            Cliente: {p.cliente?.nombre || "—"}
          </Text>
          <View style={styles.line} />
          {renderItem(it, idx + 1)}
          <Text style={styles.foot}>
            Generado automáticamente • Imanod
          </Text>
        </Page>
      ))}
    </Document>
  );
}

/* ======================= CONTENEDOR REACT (BOTÓN) ======================= */

function PedidoPDFInline({ pedido }) {
  const [protosById, setProtosById] = useState({});
  const [fotoById, setFotoById] = useState({});
  const [err, setErr] = useState("");

  const items = Array.isArray(pedido?.items) ? pedido.items : [];

  const protIds = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      if (it.id_prototipo) set.add(it.id_prototipo);
    });
    if (!items.length && pedido?.id_prototipo) {
      set.add(pedido.id_prototipo);
    }
    return Array.from(set);
  }, [items, pedido]);

  // Cargar prototipos
  useEffect(() => {
    if (!protIds.length) return;
    let alive = true;

    (async () => {
      try {
        setErr("");
        const entries = await Promise.all(
          protIds.map(async (id) => {
            const resp = await fetch(`/api/src/prototipos/${id}`, {
              credentials: "include",
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            return [id, json];
          })
        );
        if (!alive) return;
        const map = {};
        for (const [id, proto] of entries) {
          map[id] = proto;
        }
        setProtosById(map);
      } catch (e) {
        if (!alive) return;
        console.error(e);
        setErr("No se pudo cargar la información de prototipos.");
      }
    })();

    return () => {
      alive = false;
    };
  }, [protIds]);

  // Cargar fotos como dataURL por cada prototipo
  useEffect(() => {
    if (!protIds.length) {
      setFotoById({});
      return;
    }
    let alive = true;

    (async () => {
      const result = {};
      for (const id of protIds) {
        const proto = protosById[id];
        const item =
          items.find((it) => it.id_prototipo === id) || {};
        const rawFoto =
          item.prototipo_foto ||
          proto?.foto_url ||
          proto?.foto ||
          null;
        if (!rawFoto) continue;

        try {
          const cdnAbs = normalizeCdnUrl(rawFoto);
          const proxied = getProxyUrl(cdnAbs);
          const dataUrl = await fetchAsJpegDataUrl(proxied);
          if (!alive) return;
          result[id] = dataUrl;
        } catch (e) {
          if (!alive) return;
          console.error("Error cargando foto para prototipo", id, e);
        }
      }
      if (!alive) return;
      setFotoById(result);
    })();

    return () => {
      alive = false;
    };
  }, [protIds, protosById, items]);

  // Construir datos para el PDF
  const pdfData = useMemo(() => {
    if (!pedido) return null;

    const clienteNombre =
      pedido?.cliente_display ||
      pedido?.cliente_empresa ||
      [pedido?.cliente_nombre, pedido?.cliente_apellido]
        .filter(Boolean)
        .join(" ") ||
      "";

    const itemsData = items.map((it) => {
      const idProt = it.id_prototipo;
      const proto = protosById[idProt] || {};

      const bom = Array.isArray(proto.bom_detalle)
        ? proto.bom_detalle
        : [];
      const by = (cat) => bom.filter((x) => x.categoria === cat);

      const tablas = by("tabla").map((t) => ({
        tipo: t.titulo,
        medidas: {
          largo: t.largo ?? t.med_largo,
          ancho: t.ancho ?? t.med_ancho,
          espesor: t.espesor ?? t.med_espesor,
        },
        cantidad: t.cantidad ?? 0,
      }));

      const tacos = by("taco").map((t) => ({
        tipo: t.titulo,
        medidas: {
          l: t.largo,
          a: t.ancho,
          h: t.alto,
        },
        cantidad: t.cantidad ?? 0,
      }));

      const patines = by("patin").map((p) => ({
        tipo: p.titulo,
        cantidad: p.cantidad ?? 0,
      }));

      const clavos = by("clavo").map((c) => ({
        tipo: c.titulo,
        medida: c.medida || c.aclaraciones || "",
        cantidad: c.cantidad ?? 0,
      }));

      let medidas;
      if (proto?.medidas && typeof proto.medidas === "string") {
        const [l, a, h] = proto.medidas.split("x");
        medidas = { largo: l, ancho: a, alto: h };
      } else {
        medidas = {
          largo: proto?.largo,
          ancho: proto?.ancho,
          alto: proto?.alto,
        };
      }

      const cant = Number(it.cantidad_pallets || 0);
      const desdeStock = Number(it.cantidad_desde_stock || 0);
      const aProducir =
        Number(
          it.cantidad_a_producir ??
            cant - desdeStock
        ) || 0;

      return {
        id_prototipo: idProt,
        cantidad_pallets: cant,
        cantidad_desde_stock: desdeStock,
        cantidad_a_producir: aProducir,
        numero_tratamiento: it.numero_tratamiento || "",
        numero_lote: it.numero_lote || "",
        comentarios: (it.comentarios || "").toString(),
        prototipo: {
          nombre:
            proto?.titulo ||
            proto?.nombre ||
            `Prototipo #${idProt}`,
          foto_url: fotoById[idProt] || null,
          medidas,
          tablas,
          tacos,
          patines,
          clavos,
        },
      };
    });

    return {
      id_pedido: pedido?.id_pedido,
      fecha_realizado_str: fmtDate(pedido?.fecha_realizado),
      fecha_entrega_str: fmtDate(pedido?.fecha_de_entrega),
      observaciones: (pedido?.comentarios || "").toString(),
      cliente: { nombre: clienteNombre },
      items: itemsData,
    };
  }, [pedido, items, protosById, fotoById]);

  if (!pedido) {
    return (
      <button
        disabled
        className="px-3 py-2 bg-gray-300 rounded"
      >
        Sin datos
      </button>
    );
  }

  if (err) {
    return (
      <span className="text-xs text-red-600">
        {err}
      </span>
    );
  }

  if (!pdfData) {
    return (
      <button
        disabled
        className="px-3 py-2 bg-gray-300 rounded"
      >
        Generando…
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={<PedidosPDF data={pdfData} />}
      fileName={`pedido_${pedido?.id_pedido || "sin-id"}.pdf`}
      className="px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-800 text-white"
    >
      {({ loading }) => (loading ? "Generando…" : "🧾 PDF")}
    </PDFDownloadLink>
  );
}

export default PedidoPDFInline;
