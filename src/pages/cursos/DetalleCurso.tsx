// src/pages/cursos/DetalleCurso.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  ListItemSecondaryAction,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import {
  ArrowBack,
  Edit,
  Delete,
  School,
  Group,
  MenuBook,
  Person,
  CalendarToday,
  AssignmentInd,
  Add,
  Remove,
  Schedule,
} from "@mui/icons-material";
import cursoService, {
  Curso,
  EstudianteCurso,
  AsignaturaCurso,
} from "../../services/cursoService";
import asignaturaService from "../../services/asignaturaService";
import axiosInstance from "../../api/axiosConfig";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store";

// Interfaz para el estado de las pestañas
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Componente para el panel de pestañas
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`curso-tabpanel-${index}`}
      aria-labelledby={`curso-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// Interfaz para representar un docente con información completa
interface DocenteInfo {
  _id: string;
  nombre: string;
  apellidos: string;
  email?: string;
}

const DetalleCurso = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [curso, setCurso] = useState<Curso | null>(null);
  const [estudiantes, setEstudiantes] = useState<EstudianteCurso[]>([]);
  const [asignaturas, setAsignaturas] = useState<AsignaturaCurso[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [deleteDialog, setDeleteDialog] = useState<boolean>(false);
  const [docentesInfo, setDocentesInfo] = useState<Map<string, DocenteInfo>>(
    new Map()
  );
  const [removeEstudianteDialog, setRemoveEstudianteDialog] = useState<{
    open: boolean;
    estudiante: EstudianteCurso | null;
  }>({
    open: false,
    estudiante: null,
  });
  const [removeAsignaturaDialog, setRemoveAsignaturaDialog] = useState<{
    open: boolean;
    asignatura: AsignaturaCurso | null;
  }>({
    open: false,
    asignatura: null,
  });

  useEffect(() => {
    if (id) {
      cargarCurso();
      cargarEstudiantes();
      cargarAsignaturas();
    }
  }, [id]);

  const cargarCurso = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await cursoService.obtenerCurso(id);

      if (response?.success) {
        setCurso(response.data);
      } else {
        throw new Error("Error al cargar curso");
      }
    } catch (err: any) {
      console.error("Error al cargar curso:", err);
      setError(
        err.response?.data?.message ||
          "No se pudo cargar la información del curso"
      );
    } finally {
      setLoading(false);
    }
  };

  const cargarEstudiantes = async () => {
    if (!id) return;

    try {
      const response = await cursoService.obtenerEstudiantesCurso(id);

      if (response?.success) {
        setEstudiantes(response.data || []);
      }
    } catch (err: any) {
      console.error("Error al cargar estudiantes:", err);
    }
  };

  // Función para cargar docentes por IDs
  const cargarDocentes = async (docenteIds: string[]) => {
    if (!docenteIds || docenteIds.length === 0) return;

    try {
      // Filtrar IDs que ya tenemos en el caché
      const idsACargar = docenteIds.filter((id) => !docentesInfo.has(id));

      if (idsACargar.length === 0) return;

      // Usar el endpoint correcto para obtener usuarios por IDs
      const respuesta = await axiosInstance.get("/api/usuarios", {
        params: {
          ids: idsACargar.join(","),
          tipo: "DOCENTE",
        },
      });

      if (respuesta.data?.success && respuesta.data.data) {
        const nuevosDocentes = new Map(docentesInfo);

        respuesta.data.data.forEach((docente: DocenteInfo) => {
          nuevosDocentes.set(docente._id, {
            _id: docente._id,
            nombre: docente.nombre || "Sin nombre",
            apellidos: docente.apellidos || "",
            email: docente.email,
          });
        });

        setDocentesInfo(nuevosDocentes);
        return nuevosDocentes;
      }
    } catch (error) {
      console.error("Error al cargar información de docentes:", error);
    }

    return docentesInfo;
  };

  const cargarAsignaturas = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Usar el servicio asignaturaService con expand=docente
      const response = await asignaturaService.obtenerAsignaturas({
        cursoId: id,
        expand: "docente",
      });

      if (response.success) {
        let asignaturasData = response.data || [];
        console.log("Asignaturas cargadas:", asignaturasData);

        // Extraer IDs de docentes para cargar información adicional
        const docenteIds: string[] = [];

        asignaturasData.forEach((asignatura: any) => {
          if (asignatura.docenteId) {
            docenteIds.push(asignatura.docenteId);
          } else if (
            asignatura.docente &&
            typeof asignatura.docente === "string"
          ) {
            docenteIds.push(asignatura.docente);
          } else if (
            asignatura.docente &&
            typeof asignatura.docente === "object" &&
            asignatura.docente._id
          ) {
            docenteIds.push(asignatura.docente._id);
          }
        });

        // Cargar información de docentes si es necesario
        if (docenteIds.length > 0) {
          const docentesActualizados = await cargarDocentes(docenteIds);

          // Si tenemos información de docentes actualizada, mejorar los datos de asignaturas
          if (docentesActualizados && docentesActualizados.size > 0) {
            asignaturasData = asignaturasData.map((asignatura: any) => {
              const docenteId =
                asignatura.docenteId ||
                (typeof asignatura.docente === "string"
                  ? asignatura.docente
                  : null) ||
                (asignatura.docente && asignatura.docente._id
                  ? asignatura.docente._id
                  : null);

              if (docenteId && docentesActualizados.has(docenteId)) {
                return {
                  ...asignatura,
                  docente: docentesActualizados.get(docenteId),
                };
              }
              return asignatura;
            });
          }
        }

        setAsignaturas(
          asignaturasData.map((asignatura: any) => ({
            ...asignatura,
            docente: asignatura.docente || {
              _id: "",
              nombre: "No asignado",
              apellidos: "",
            },
          })) as AsignaturaCurso[]
        );
      }
    } catch (err: any) {
      console.error("Error al cargar asignaturas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDeleteCurso = async () => {
    if (!id) return;

    try {
      setLoading(true);
      await cursoService.eliminarCurso(id);
      navigate("/cursos", {
        state: { message: "Curso eliminado exitosamente" },
      });
    } catch (err: any) {
      console.error("Error al eliminar curso:", err);
      setError(err.response?.data?.message || "No se pudo eliminar el curso");
    } finally {
      setLoading(false);
      setDeleteDialog(false);
    }
  };

  const handleRemoveEstudiante = async () => {
    if (!id || !removeEstudianteDialog.estudiante) return;

    try {
      setLoading(true);
      await cursoService.eliminarEstudianteCurso(
        id,
        removeEstudianteDialog.estudiante._id
      );

      // Actualizar lista de estudiantes
      setEstudiantes(
        estudiantes.filter(
          (est) => est._id !== removeEstudianteDialog.estudiante?._id
        )
      );
    } catch (err: any) {
      console.error("Error al eliminar estudiante del curso:", err);
      setError(
        err.response?.data?.message ||
          "No se pudo eliminar el estudiante del curso"
      );
    } finally {
      setLoading(false);
      setRemoveEstudianteDialog({ open: false, estudiante: null });
    }
  };

  const handleRemoveAsignatura = async () => {
    if (!id || !removeAsignaturaDialog.asignatura) return;

    try {
      setLoading(true);
      await cursoService.eliminarAsignaturaCurso(
        id,
        removeAsignaturaDialog.asignatura._id
      );

      // Actualizar lista de asignaturas
      setAsignaturas(
        asignaturas.filter(
          (asig) => asig._id !== removeAsignaturaDialog.asignatura?._id
        )
      );
    } catch (err: any) {
      console.error("Error al eliminar asignatura del curso:", err);
      setError(
        err.response?.data?.message ||
          "No se pudo eliminar la asignatura del curso"
      );
    } finally {
      setLoading(false);
      setRemoveAsignaturaDialog({ open: false, asignatura: null });
    }
  };

  // Obtener color para el chip de estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "ACTIVO":
        return "success";
      case "INACTIVO":
        return "error";
      case "FINALIZADO":
        return "warning";
      default:
        return "default";
    }
  };

  // Obtener iniciales para el avatar de estudiante
  const getInitials = (nombre: string, apellidos: string) => {
    if (!nombre || !apellidos) return "?";
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  // Obtener texto descriptivo para la jornada
  const getJornadaText = (jornada?: string) => {
    switch (jornada) {
      case "MATUTINA":
        return "Matutina (Mañana)";
      case "VESPERTINA":
        return "Vespertina (Tarde)";
      case "NOCTURNA":
        return "Nocturna (Noche)";
      case "COMPLETA":
        return "Completa (Todo el día)";
      default:
        return "No asignada";
    }
  };

  // Función para obtener nombre del docente de forma segura
  const getNombreDocente = (asignatura: AsignaturaCurso): string => {
    // CASO 1: Si docente es un objeto con nombre y apellidos
    if (asignatura.docente && typeof asignatura.docente === "object") {
      const docente = asignatura.docente;
      if (docente.nombre && docente.apellidos) {
        return `${docente.nombre} ${docente.apellidos}`;
      }
      if (docente.nombre) {
        return docente.nombre;
      }
    }

    // CASO 2: Buscar en el caché de docentes si tenemos el ID del docente
    if (asignatura.docente && asignatura.docente._id) {
      const docenteInfo = docentesInfo.get(asignatura.docente._id);
      if (docenteInfo) {
        return `${docenteInfo.nombre} ${docenteInfo.apellidos}`;
      }
    }

    return "No asignado";
  };

  if (loading && !curso) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !curso) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/cursos")}
          sx={{ mb: 3 }}
        >
          Volver a la lista
        </Button>

        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
            "& .MuiAlert-message": {
              fontWeight: 500,
            },
          }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!curso) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate("/cursos")}
          sx={{ mb: 3 }}
        >
          Volver a la lista
        </Button>

        <Alert
          severity="info"
          sx={{
            borderRadius: 2,
            "& .MuiAlert-message": {
              fontWeight: 500,
            },
          }}
        >
          No se encontró información del curso
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Botón para regresar y título */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/cursos")}
          sx={{
            borderRadius: 20,
            borderColor: "rgba(0, 0, 0, 0.12)",
            color: "text.secondary",
          }}
        >
          Volver a la lista
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Edit />}
            onClick={() => navigate(`/cursos/editar/${curso._id}`)}
            sx={{
              borderRadius: 20,
              fontWeight: 500,
              boxShadow: "none",
              "&:hover": {
                boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
              },
            }}
          >
            Editar
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={() => setDeleteDialog(true)}
            sx={{
              borderRadius: 20,
              borderColor: "error.main",
              "&:hover": {
                backgroundColor: "rgba(244, 67, 54, 0.04)",
              },
            }}
          >
            Eliminar
          </Button>
        </Box>
      </Box>

      {/* Alerta de error */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 2,
            "& .MuiAlert-message": {
              fontWeight: 500,
            },
          }}
        >
          {error}
        </Alert>
      )}

      {/* Información general del curso */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                py: 3,
                px: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <School sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                {curso.nombre}
              </Typography>
              <Chip
                label={curso.estado}
                color={getEstadoColor(curso.estado) as any}
                sx={{
                  fontWeight: "bold",
                  borderRadius: 8,
                  bgcolor: "white",
                  color:
                    curso.estado === "ACTIVO"
                      ? "success.main"
                      : curso.estado === "INACTIVO"
                      ? "error.main"
                      : "warning.main",
                }}
              />
            </Box>

            <CardContent>
              <List>
                <ListItem>
                  <CalendarToday color="primary" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Año académico"
                    secondary={curso.año_academico}
                    primaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                    secondaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
                <Divider component="li" />

                <ListItem>
                  <School color="primary" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Grado - Grupo"
                    secondary={
                      curso.grado && curso.grupo
                        ? `${curso.grado}° - ${curso.grupo}`
                        : "No asignado"
                    }
                    primaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                    secondaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
                <Divider component="li" />

                {/* Nuevo item para mostrar la jornada */}
                <ListItem>
                  <Schedule color="primary" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Jornada"
                    secondary={getJornadaText(curso.jornada)}
                    primaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                    secondaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
                <Divider component="li" />

                <ListItem>
                  <AssignmentInd color="primary" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Director de grupo"
                    secondary={
                      typeof curso.director_grupo === "object" &&
                      curso.director_grupo !== null
                        ? curso.director_grupo.nombre &&
                          curso.director_grupo.apellidos
                          ? `${curso.director_grupo.nombre} ${curso.director_grupo.apellidos}`
                          : "Docente asignado"
                        : "No asignado"
                    }
                    primaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                    secondaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
                <Divider component="li" />

                <ListItem>
                  <Group color="primary" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Estudiantes"
                    secondary={estudiantes.length}
                    primaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                    secondaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
                <Divider component="li" />

                <ListItem>
                  <MenuBook color="primary" sx={{ mr: 2 }} />
                  <ListItemText
                    primary="Asignaturas"
                    secondary={asignaturas.length}
                    primaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                    secondaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.05)",
              height: "100%",
            }}
          >
            <Box sx={{ px: 3, py: 2, bgcolor: "primary.main", color: "white" }}>
              <Typography variant="h3">Detalles del Curso</Typography>
            </Box>

            <Box sx={{ px: 3, py: 3 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                sx={{
                  borderBottom: 1,
                  borderColor: "divider",
                  "& .MuiTabs-indicator": {
                    backgroundColor: "primary.main",
                  },
                  "& .Mui-selected": {
                    color: "primary.main",
                    fontWeight: "bold",
                  },
                }}
              >
                <Tab
                  label="Estudiantes"
                  icon={<Group />}
                  iconPosition="start"
                  sx={{ textTransform: "none", minHeight: 48 }}
                />
                <Tab
                  label="Asignaturas"
                  icon={<MenuBook />}
                  iconPosition="start"
                  sx={{ textTransform: "none", minHeight: 48 }}
                />
              </Tabs>

              {/* Panel de Estudiantes */}
              <TabPanel value={tabValue} index={0}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="h4" color="primary.main">
                    Estudiantes del Curso
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Add />}
                    onClick={() =>
                      navigate(`/cursos/${curso._id}/estudiantes/agregar`)
                    }
                    sx={{
                      borderRadius: 20,
                      fontWeight: 500,
                      boxShadow: "none",
                      "&:hover": {
                        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    Agregar Estudiante
                  </Button>
                </Box>

                {loading && estudiantes.length === 0 ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 3 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : estudiantes.length > 0 ? (
                  <List>
                    {estudiantes.map((estudiante) => (
                      <ListItem
                        key={estudiante._id}
                        sx={{
                          borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
                          "&:hover": {
                            bgcolor: "rgba(93, 169, 233, 0.08)",
                          },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.main" }}>
                            {getInitials(
                              estudiante.nombre,
                              estudiante.apellidos
                            )}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${estudiante.nombre} ${estudiante.apellidos}`}
                          secondary={estudiante.email}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() =>
                              setRemoveEstudianteDialog({
                                open: true,
                                estudiante,
                              })
                            }
                            sx={{
                              bgcolor: "rgba(244, 67, 54, 0.1)",
                              "&:hover": { bgcolor: "rgba(244, 67, 54, 0.2)" },
                            }}
                          >
                            <Remove />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 2,
                      "& .MuiAlert-message": {
                        fontWeight: 500,
                      },
                    }}
                  >
                    No hay estudiantes asignados a este curso.
                  </Alert>
                )}
              </TabPanel>

              {/* Panel de Asignaturas */}
              <TabPanel value={tabValue} index={1}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 2,
                  }}
                >
                  <Typography variant="h4" color="primary.main">
                    Asignaturas del Curso
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<Add />}
                    onClick={() =>
                      navigate(`/cursos/${curso._id}/asignaturas/agregar`)
                    }
                    sx={{
                      borderRadius: 20,
                      fontWeight: 500,
                      boxShadow: "none",
                      "&:hover": {
                        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    Agregar Asignatura
                  </Button>
                </Box>

                {loading && asignaturas.length === 0 ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 3 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : asignaturas.length > 0 ? (
                  <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{ mt: 2 }}
                  >
                    <Table>
                      <TableHead sx={{ bgcolor: "rgba(0, 0, 0, 0.03)" }}>
                        <TableRow>
                          <TableCell>Nombre</TableCell>
                          <TableCell>Docente</TableCell>
                          <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {asignaturas.map((asignatura) => (
                          <TableRow
                            key={asignatura._id}
                            sx={{
                              "&:hover": {
                                bgcolor: "rgba(93, 169, 233, 0.08)",
                              },
                              cursor: "pointer",
                            }}
                            onClick={() =>
                              navigate(`/asignaturas/${asignatura._id}`)
                            }
                          >
                            <TableCell sx={{ fontWeight: 500 }}>
                              {asignatura.nombre}
                            </TableCell>
                            <TableCell>
                              {getNombreDocente(asignatura)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevenir la navegación
                                  setRemoveAsignaturaDialog({
                                    open: true,
                                    asignatura,
                                  });
                                }}
                                sx={{
                                  bgcolor: "rgba(244, 67, 54, 0.1)",
                                  "&:hover": {
                                    bgcolor: "rgba(244, 67, 54, 0.2)",
                                  },
                                }}
                              >
                                <Remove />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 2,
                      "& .MuiAlert-message": {
                        fontWeight: 500,
                      },
                    }}
                  >
                    No hay asignaturas asignadas a este curso.
                  </Alert>
                )}
              </TabPanel>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo de confirmación para eliminar curso */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea eliminar el curso {curso.nombre}? Esta acción
            no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setDeleteDialog(false)}
            color="inherit"
            sx={{
              borderRadius: 20,
              px: 3,
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleDeleteCurso}
            color="error"
            variant="contained"
            sx={{
              borderRadius: 20,
              px: 3,
              boxShadow: "none",
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para eliminar estudiante del curso */}
      <Dialog
        open={removeEstudianteDialog.open}
        onClose={() =>
          setRemoveEstudianteDialog({ open: false, estudiante: null })
        }
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle>Quitar estudiante del curso</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea quitar al estudiante{" "}
            {removeEstudianteDialog.estudiante?.nombre}{" "}
            {removeEstudianteDialog.estudiante?.apellidos} de este curso?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() =>
              setRemoveEstudianteDialog({ open: false, estudiante: null })
            }
            color="inherit"
            sx={{
              borderRadius: 20,
              px: 3,
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRemoveEstudiante}
            color="error"
            variant="contained"
            sx={{
              borderRadius: 20,
              px: 3,
              boxShadow: "none",
            }}
          >
            Quitar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para eliminar asignatura del curso */}
      <Dialog
        open={removeAsignaturaDialog.open}
        onClose={() =>
          setRemoveAsignaturaDialog({ open: false, asignatura: null })
        }
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        <DialogTitle>Quitar asignatura del curso</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro que desea quitar la asignatura{" "}
            {removeAsignaturaDialog.asignatura?.nombre} de este curso?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() =>
              setRemoveAsignaturaDialog({ open: false, asignatura: null })
            }
            color="inherit"
            sx={{
              borderRadius: 20,
              px: 3,
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRemoveAsignatura}
            color="error"
            variant="contained"
            sx={{
              borderRadius: 20,
              px: 3,
              boxShadow: "none",
            }}
          >
            Quitar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DetalleCurso;
