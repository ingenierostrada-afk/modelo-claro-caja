import { useEffect, useMemo, useState } from "react";

const movimientoInicial = {
  id: "",
  fecha: "",
  tipo: "ingreso",
  concepto: "",
  categoria: "Ventas",
  monto: "",
  medioPago: "Efectivo",
  notas: "",
};

const cajaInicial = {
  emprendimiento: {
    nombre: "",
    rubro: "",
  },
  movimientos: [],
};

const categoriasIngreso = ["Ventas", "Servicios", "Señas", "Otros ingresos"];

const categoriasEgreso = [
  "Insumos",
  "Alquiler",
  "Servicios",
  "Transporte",
  "Packaging",
  "Sueldos",
  "Impuestos",
  "Otros gastos",
];

const mediosPago = ["Efectivo", "Transferencia", "Mercado Pago", "Tarjeta", "Otro"];

export default function App() {
  const [paso, setPaso] = useState(0);
  const [caja, setCaja] = useState(cajaInicial);
  const [formulario, setFormulario] = useState({
    ...movimientoInicial,
    fecha: fechaHoy(),
  });
  const [editandoId, setEditandoId] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState("mes");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => {
    const guardado = localStorage.getItem("modelo-claro-caja");

    if (guardado) {
      const datos = JSON.parse(guardado);

      setCaja({
        ...cajaInicial,
        ...datos,
        emprendimiento: {
          ...cajaInicial.emprendimiento,
          ...datos.emprendimiento,
        },
        movimientos: datos.movimientos || [],
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("modelo-claro-caja", JSON.stringify(caja));
  }, [caja]);

  const pasos = ["Inicio", "1. Emprendimiento", "2. Registrar", "3. Movimientos", "4. Resumen"];

  const actualizarEmprendimiento = (campo, valor) => {
    setCaja((prev) => ({
      ...prev,
      emprendimiento: {
        ...prev.emprendimiento,
        [campo]: valor,
      },
    }));
  };

  const actualizarFormulario = (campo, valor) => {
    setFormulario((prev) => {
      const actualizado = {
        ...prev,
        [campo]: valor,
      };

      if (campo === "tipo") {
        actualizado.categoria = valor === "ingreso" ? "Ventas" : "Insumos";
      }

      return actualizado;
    });
  };

  const movimientosFiltrados = useMemo(() => {
    return caja.movimientos
      .filter((movimiento) => filtrarPorPeriodo(movimiento.fecha, filtroPeriodo))
      .filter((movimiento) => filtroTipo === "todos" || movimiento.tipo === filtroTipo)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [caja.movimientos, filtroPeriodo, filtroTipo]);

  const resumen = useMemo(() => {
    const calcular = (movimientos) => {
      const ingresos = movimientos
        .filter((movimiento) => movimiento.tipo === "ingreso")
        .reduce((acc, movimiento) => acc + (Number(movimiento.monto) || 0), 0);

      const egresos = movimientos
        .filter((movimiento) => movimiento.tipo === "egreso")
        .reduce((acc, movimiento) => acc + (Number(movimiento.monto) || 0), 0);

      return {
        ingresos,
        egresos,
        saldo: ingresos - egresos,
        cantidad: movimientos.length,
      };
    };

    const todos = calcular(caja.movimientos);
    const filtrado = calcular(movimientosFiltrados);

    const egresosPorCategoria = caja.movimientos
      .filter((movimiento) => movimiento.tipo === "egreso")
      .reduce((acc, movimiento) => {
        const categoria = movimiento.categoria || "Sin categoría";
        acc[categoria] = (acc[categoria] || 0) + (Number(movimiento.monto) || 0);
        return acc;
      }, {});

    const categoriaMayorGasto = Object.entries(egresosPorCategoria).sort((a, b) => b[1] - a[1])[0];

    return {
      todos,
      filtrado,
      categoriaMayorGasto,
    };
  }, [caja.movimientos, movimientosFiltrados]);

  const guardarMovimiento = () => {
    const monto = Number(formulario.monto) || 0;

    if (!formulario.fecha) {
      alert("Cargá una fecha para el movimiento.");
      return;
    }

    if (!formulario.concepto.trim()) {
      alert("Cargá un concepto para identificar el movimiento.");
      return;
    }

    if (monto <= 0) {
      alert("El monto tiene que ser mayor a cero.");
      return;
    }

    if (editandoId) {
      setCaja((prev) => ({
        ...prev,
        movimientos: prev.movimientos.map((movimiento) =>
          movimiento.id === editandoId
            ? {
                ...formulario,
                id: editandoId,
                monto,
              }
            : movimiento
        ),
      }));
    } else {
      const nuevoMovimiento = {
        ...formulario,
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        monto,
      };

      setCaja((prev) => ({
        ...prev,
        movimientos: [nuevoMovimiento, ...prev.movimientos],
      }));
    }

    limpiarFormulario();
    setPaso(3);
  };

  const limpiarFormulario = () => {
    setFormulario({
      ...movimientoInicial,
      fecha: fechaHoy(),
    });
    setEditandoId(null);
  };

  const editarMovimiento = (movimiento) => {
    setFormulario({
      ...movimiento,
      monto: String(movimiento.monto),
    });
    setEditandoId(movimiento.id);
    setPaso(2);
  };

  const eliminarMovimiento = (id) => {
    if (confirm("¿Querés eliminar este movimiento?")) {
      setCaja((prev) => ({
        ...prev,
        movimientos: prev.movimientos.filter((movimiento) => movimiento.id !== id),
      }));
    }
  };

  const reiniciar = () => {
    if (confirm("¿Querés borrar la caja y empezar de nuevo?")) {
      localStorage.removeItem("modelo-claro-caja");
      setCaja(cajaInicial);
      limpiarFormulario();
      setPaso(0);
    }
  };

  const categoriasDisponibles = formulario.tipo === "ingreso" ? categoriasIngreso : categoriasEgreso;

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.leftHeader}>
            <img src="/logo-club.png" style={styles.logoClub} />
          </div>

          <div style={styles.headerCenter}>
            <h1 style={styles.logo}>Modelo Claro Caja</h1>
            <p style={styles.subtitulo}>Registro simple de ingresos y egresos</p>
          </div>
        </div>
      </header>

      <div style={styles.progreso}>
        <div style={styles.pasosContainer}>
          {pasos.map((p, i) => (
            <button
              key={p}
              onClick={() => setPaso(i)}
              style={{
                ...styles.paso,
                background: i === paso ? "#0f766e" : "#e5e7eb",
                color: i === paso ? "white" : "#374151",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <button style={styles.botonSecundario} onClick={reiniciar}>
          Nueva caja
        </button>
      </div>

      <main style={styles.card}>
        {paso === 0 && (
          <section style={styles.centrado}>
            <h2>Controlá la caja de tu emprendimiento</h2>
            <p style={styles.textoGrande}>
              Registrá lo que entra y lo que sale. La app calcula automáticamente tus ingresos,
              egresos y saldo para que puedas reemplazar el cuaderno o el Excel con una herramienta simple.
            </p>

            <div style={styles.destacado}>
              No hace falta saber contabilidad. Solo anotar cada movimiento de plata.
            </div>

            <div style={styles.resultadoGrid}>
              <Tarjeta titulo="Ingresos totales" valor={`$${formato(resumen.todos.ingresos)}`} />
              <Tarjeta titulo="Egresos totales" valor={`$${formato(resumen.todos.egresos)}`} />
              <Tarjeta titulo="Saldo actual" valor={`$${formato(resumen.todos.saldo)}`} destacado={resumen.todos.saldo >= 0} />
            </div>

            <button style={styles.botonPrincipal} onClick={() => setPaso(1)}>
              Empezar
            </button>
          </section>
        )}

        {paso === 1 && (
          <section>
            <h2 style={styles.tituloSeccion}>1. Datos del emprendimiento</h2>

            <Campo
              label="¿Cómo se llama tu emprendimiento?"
              ayuda="Este dato ayuda a identificar la caja. Si todavía no tiene nombre, podés poner uno provisorio."
              value={caja.emprendimiento.nombre}
              onChange={(v) => actualizarEmprendimiento("nombre", v)}
            />

            <Campo
              label="¿En qué rubro estás?"
              ayuda="Ej: alimentos, indumentaria, servicios, estética, construcción, tecnología."
              value={caja.emprendimiento.rubro}
              onChange={(v) => actualizarEmprendimiento("rubro", v)}
            />
          </section>
        )}

        {paso === 2 && (
          <section>
            <h2 style={styles.tituloSeccion}>{editandoId ? "Editar movimiento" : "2. Registrar movimiento"}</h2>

            <p style={styles.texto}>
              Cargá cada ingreso o egreso en el momento en que ocurre. La clave del sistema es que sea rápido,
              claro y fácil de sostener en el tiempo.
            </p>

            <div style={styles.selectorTipo}>
              <button
                style={{
                  ...styles.botonTipo,
                  background: formulario.tipo === "ingreso" ? "#dcfce7" : "#f9fafb",
                  color: formulario.tipo === "ingreso" ? "#166534" : "#374151",
                  borderColor: formulario.tipo === "ingreso" ? "#86efac" : "#e5e7eb",
                }}
                onClick={() => actualizarFormulario("tipo", "ingreso")}
              >
                + Ingreso
              </button>

              <button
                style={{
                  ...styles.botonTipo,
                  background: formulario.tipo === "egreso" ? "#fee2e2" : "#f9fafb",
                  color: formulario.tipo === "egreso" ? "#991b1b" : "#374151",
                  borderColor: formulario.tipo === "egreso" ? "#fecaca" : "#e5e7eb",
                }}
                onClick={() => actualizarFormulario("tipo", "egreso")}
              >
                - Egreso
              </button>
            </div>

            <div style={styles.formGrid}>
              <Campo
                label="Fecha"
                type="date"
                value={formulario.fecha}
                onChange={(v) => actualizarFormulario("fecha", v)}
              />

              <Campo
                label="Monto"
                ayuda="Cargá solo números. Ej: 12500"
                type="number"
                value={formulario.monto}
                onChange={(v) => actualizarFormulario("monto", v)}
              />
            </div>

            <Campo
              label="Concepto"
              ayuda="Ej: venta de torta, compra de harina, pago de alquiler, cobro de servicio."
              value={formulario.concepto}
              onChange={(v) => actualizarFormulario("concepto", v)}
            />

            <div style={styles.formGrid}>
              <CampoSelect
                label="Categoría"
                value={formulario.categoria}
                opciones={categoriasDisponibles}
                onChange={(v) => actualizarFormulario("categoria", v)}
              />

              <CampoSelect
                label="Medio de pago"
                value={formulario.medioPago}
                opciones={mediosPago}
                onChange={(v) => actualizarFormulario("medioPago", v)}
              />
            </div>

            <CampoArea
              label="Notas opcionales"
              ayuda="Podés agregar cliente, detalle del pedido o cualquier aclaración útil."
              value={formulario.notas}
              onChange={(v) => actualizarFormulario("notas", v)}
            />

            <div style={styles.accionesFormulario}>
              <button style={styles.botonPrincipal} onClick={guardarMovimiento}>
                {editandoId ? "Guardar cambios" : "Guardar movimiento"}
              </button>

              {editandoId && (
                <button style={styles.botonSecundario} onClick={limpiarFormulario}>
                  Cancelar edición
                </button>
              )}
            </div>
          </section>
        )}

        {paso === 3 && (
          <section>
            <h2 style={styles.tituloSeccion}>3. Movimientos</h2>

            <div style={styles.resumenBarra}>
              <div>
                <strong>Saldo filtrado:</strong> ${formato(resumen.filtrado.saldo)}
              </div>
              <div>
                <strong>Movimientos:</strong> {resumen.filtrado.cantidad}
              </div>
            </div>

            <div style={styles.filtros}>
              <CampoSelect
                label="Período"
                value={filtroPeriodo}
                opciones={[
                  { valor: "hoy", texto: "Hoy" },
                  { valor: "semana", texto: "Esta semana" },
                  { valor: "mes", texto: "Este mes" },
                  { valor: "todos", texto: "Todos" },
                ]}
                onChange={setFiltroPeriodo}
              />

              <CampoSelect
                label="Tipo"
                value={filtroTipo}
                opciones={[
                  { valor: "todos", texto: "Todos" },
                  { valor: "ingreso", texto: "Ingresos" },
                  { valor: "egreso", texto: "Egresos" },
                ]}
                onChange={setFiltroTipo}
              />
            </div>

            {movimientosFiltrados.length === 0 && (
              <div style={styles.vacio}>
                Todavía no hay movimientos para este filtro. Registrá un ingreso o egreso para empezar.
              </div>
            )}

            <div style={styles.listaMovimientos}>
              {movimientosFiltrados.map((movimiento) => (
                <div key={movimiento.id} style={styles.movimientoCard}>
                  <div style={styles.movimientoPrincipal}>
                    <div>
                      <div style={styles.movimientoFecha}>{formatearFecha(movimiento.fecha)}</div>
                      <h3 style={styles.movimientoConcepto}>{movimiento.concepto}</h3>
                      <div style={styles.movimientoMeta}>
                        {movimiento.categoria} · {movimiento.medioPago}
                      </div>
                      {movimiento.notas && <p style={styles.notas}>{movimiento.notas}</p>}
                    </div>

                    <div
                      style={{
                        ...styles.montoMovimiento,
                        color: movimiento.tipo === "ingreso" ? "#166534" : "#991b1b",
                      }}
                    >
                      {movimiento.tipo === "ingreso" ? "+" : "-"}${formato(movimiento.monto)}
                    </div>
                  </div>

                  <div style={styles.accionesMovimiento}>
                    <button style={styles.botonMini} onClick={() => editarMovimiento(movimiento)}>
                      Editar
                    </button>
                    <button style={styles.botonEliminar} onClick={() => eliminarMovimiento(movimiento.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {paso === 4 && (
          <section>
            <h2 style={styles.tituloSeccion}>4. Resumen de caja</h2>

            <div style={styles.resumenValor}>
              <h3>{caja.emprendimiento.nombre || "Emprendimiento sin nombre"}</h3>
              <p style={styles.textoAzul}>Rubro: {caja.emprendimiento.rubro || "-"}</p>
            </div>

            <div style={styles.resultadoGrid}>
              <Tarjeta titulo="Ingresos totales" valor={`$${formato(resumen.todos.ingresos)}`} />
              <Tarjeta titulo="Egresos totales" valor={`$${formato(resumen.todos.egresos)}`} />
              <Tarjeta titulo="Saldo actual" valor={`$${formato(resumen.todos.saldo)}`} destacado={resumen.todos.saldo >= 0} />
              <Tarjeta titulo="Movimientos cargados" valor={resumen.todos.cantidad} />
            </div>

            <div style={styles.reflexion}>
              <h3>Lectura rápida</h3>
              {resumen.todos.cantidad === 0 && (
                <p>Todavía no hay movimientos cargados. Empezá registrando ingresos y egresos reales.</p>
              )}

              {resumen.todos.cantidad > 0 && resumen.todos.saldo >= 0 && (
                <p>
                  La caja está positiva: entró más dinero del que salió. Esto no reemplaza el cálculo de rentabilidad,
                  pero ayuda a ver si el emprendimiento está generando caja.
                </p>
              )}

              {resumen.todos.cantidad > 0 && resumen.todos.saldo < 0 && (
                <p>
                  La caja está negativa: salieron más fondos de los que entraron. Conviene revisar gastos grandes,
                  ventas pendientes de cobro o compras realizadas para stock.
                </p>
              )}

              {resumen.categoriaMayorGasto && (
                <p>
                  La categoría con mayor egreso hasta ahora es <strong>{resumen.categoriaMayorGasto[0]}</strong>, con un total de{" "}
                  <strong>${formato(resumen.categoriaMayorGasto[1])}</strong>.
                </p>
              )}
            </div>
          </section>
        )}

        <footer style={styles.footer}>
          <button
            style={styles.botonSecundario}
            disabled={paso === 0}
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
          >
            Atrás
          </button>

          <div style={styles.footerDerecha}>
            <button style={styles.botonMini} onClick={() => setPaso(2)}>
              + Registrar
            </button>

            <button
              style={styles.botonPrincipal}
              onClick={() => setPaso((p) => Math.min(pasos.length - 1, p + 1))}
            >
              {paso === pasos.length - 1 ? "Ver movimientos" : "Siguiente"}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Campo({ label, value, onChange, type = "text", ayuda = "" }) {
  return (
    <label style={styles.label}>
      <span style={styles.labelTexto}>{label}</span>
      {ayuda && <small style={styles.ayuda}>{ayuda}</small>}
      <input style={styles.input} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function CampoArea({ label, value, onChange, ayuda = "" }) {
  return (
    <label style={styles.label}>
      <span style={styles.labelTexto}>{label}</span>
      {ayuda && <small style={styles.ayuda}>{ayuda}</small>}
      <textarea
        style={{ ...styles.input, minHeight: 86, resize: "vertical" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function CampoSelect({ label, value, onChange, opciones }) {
  return (
    <label style={styles.label}>
      <span style={styles.labelTexto}>{label}</span>
      <select style={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
        {opciones.map((opcion) => {
          const valor = typeof opcion === "string" ? opcion : opcion.valor;
          const texto = typeof opcion === "string" ? opcion : opcion.texto;

          return (
            <option key={valor} value={valor}>
              {texto}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Tarjeta({ titulo, valor, destacado = false }) {
  return (
    <div
      style={{
        ...styles.tarjeta,
        background: destacado ? "#ecfdf5" : "#f9fafb",
        borderColor: destacado ? "#86efac" : "#e5e7eb",
      }}
    >
      <div style={styles.tarjetaTitulo}>{titulo}</div>
      <div style={styles.tarjetaValor}>{valor}</div>
    </div>
  );
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function formato(valor) {
  if (!isFinite(valor)) return "0";
  return Number(valor).toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";

  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

function filtrarPorPeriodo(fecha, periodo) {
  if (periodo === "todos") return true;
  if (!fecha) return false;

  const hoy = new Date();
  const movimiento = new Date(`${fecha}T00:00:00`);

  if (periodo === "hoy") {
    return movimiento.toDateString() === hoy.toDateString();
  }

  if (periodo === "semana") {
    const inicioSemana = new Date(hoy);
    const dia = inicioSemana.getDay();
    const diferencia = dia === 0 ? 6 : dia - 1;
    inicioSemana.setDate(hoy.getDate() - diferencia);
    inicioSemana.setHours(0, 0, 0, 0);

    return movimiento >= inicioSemana;
  }

  if (periodo === "mes") {
    return movimiento.getMonth() === hoy.getMonth() && movimiento.getFullYear() === hoy.getFullYear();
  }

  return true;
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "18px 24px 24px 24px",
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    color: "#111827",
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto 25px",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 40,
  },
  leftHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  headerCenter: {
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  logoClub: {
    width: 220,
    maxHeight: 120,
    objectFit: "contain",
  },
  logo: {
    margin: 0,
    fontSize: 36,
    letterSpacing: "-0.04em",
    color: "#0f766e",
  },
  subtitulo: {
    margin: "6px 0 0",
    color: "#0f766e",
    fontSize: 18,
  },
  progreso: {
    maxWidth: 1100,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pasosContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  paso: {
    padding: "10px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    border: "none",
    cursor: "pointer",
  },
  card: {
    maxWidth: 1100,
    margin: "30px auto 0",
    background: "white",
    borderRadius: 24,
    padding: 30,
    boxShadow: "0 20px 45px rgba(0,0,0,0.08)",
  },
  centrado: {
    textAlign: "center",
  },
  tituloSeccion: {
    fontSize: 26,
    fontWeight: 900,
    background: "#ccfbf1",
    padding: "14px 18px",
    borderRadius: 14,
    marginBottom: 10,
    color: "#115e59",
  },
  texto: {
    color: "#4b5563",
    lineHeight: 1.6,
  },
  textoAzul: {
    color: "#075985",
    lineHeight: 1.6,
  },
  textoGrande: {
    color: "#4b5563",
    lineHeight: 1.7,
    fontSize: 18,
    maxWidth: 850,
    margin: "0 auto",
  },
  destacado: {
    margin: "28px 0",
    padding: 22,
    borderRadius: 18,
    background: "#ecfdf5",
    color: "#065f46",
    fontWeight: 800,
    fontSize: 18,
  },
  resumenValor: {
    marginTop: 22,
    padding: 20,
    borderRadius: 18,
    background: "#f0fdfa",
    border: "1px solid #99f6e4",
    color: "#115e59",
  },
  resumenBarra: {
    margin: "18px 0",
    padding: 16,
    borderRadius: 16,
    background: "#ecfdf5",
    color: "#065f46",
    fontWeight: 700,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  label: {
    display: "grid",
    gap: 6,
    marginBottom: 18,
    fontWeight: 800,
  },
  labelTexto: {
    fontSize: 18,
  },
  ayuda: {
    color: "#6b7280",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 15,
    fontFamily: "inherit",
    background: "white",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
  filtros: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 18,
  },
  selectorTipo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    margin: "22px 0",
  },
  botonTipo: {
    border: "2px solid #e5e7eb",
    borderRadius: 16,
    padding: "18px 14px",
    fontSize: 20,
    fontWeight: 900,
    cursor: "pointer",
  },
  vacio: {
    padding: 20,
    borderRadius: 16,
    background: "#f9fafb",
    color: "#6b7280",
    marginBottom: 16,
  },
  resultadoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  tarjeta: {
    padding: 18,
    borderRadius: 18,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
  tarjetaTitulo: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: 700,
  },
  tarjetaValor: {
    fontSize: 24,
    fontWeight: 900,
    marginTop: 8,
  },
  listaMovimientos: {
    display: "grid",
    gap: 14,
  },
  movimientoCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 18,
    background: "#f9fafb",
  },
  movimientoPrincipal: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "flex-start",
  },
  movimientoFecha: {
    color: "#6b7280",
    fontWeight: 700,
    fontSize: 13,
  },
  movimientoConcepto: {
    margin: "6px 0",
    fontSize: 20,
  },
  movimientoMeta: {
    color: "#4b5563",
    fontWeight: 700,
  },
  notas: {
    color: "#6b7280",
    marginBottom: 0,
  },
  montoMovimiento: {
    fontSize: 24,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  accionesMovimiento: {
    marginTop: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  accionesFormulario: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  reflexion: {
    marginTop: 24,
    padding: 20,
    borderRadius: 18,
    background: "#f3f4f6",
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 32,
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
  },
  footerDerecha: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  botonPrincipal: {
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
  },
  botonSecundario: {
    background: "#0055A4",
    color: "white",
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    fontWeight: 900,
    cursor: "pointer",
  },
  botonMini: {
    background: "#ccfbf1",
    color: "#115e59",
    border: "none",
    borderRadius: 10,
    padding: "9px 13px",
    fontWeight: 800,
    cursor: "pointer",
  },
  botonEliminar: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    cursor: "pointer",
  },
};
