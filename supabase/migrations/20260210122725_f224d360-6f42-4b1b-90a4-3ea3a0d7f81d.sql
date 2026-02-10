
-- =====================================================
-- DOCUMENTO 1: DECLARACION DE SALUD
-- =====================================================
INSERT INTO documentos_formularios (id, nombre, descripcion, tipo, activo)
VALUES ('d1000000-0001-0000-0000-000000000001', 'DECLARACION DE SALUD', 'Declaración de salud del trabajador con antecedentes personales, laborales y familiares', 'declaracion', true);

-- Texto informativo encabezado
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000001', 'd1000000-0001-0000-0000-000000000001', 
'DECLARACIÓN DE SALUD

Nombre: {{nombre}}
RUT: {{rut}}
Edad: {{edad}}
Teléfono: {{telefono}}
Empresa: {{empresa}}
Fecha: {{fecha_actual}}', 'texto_informativo', NULL, false, 1);

-- Examen Ocupacional
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000002', 'd1000000-0001-0000-0000-000000000001', 'Lugar del último examen ocupacional', 'texto', NULL, false, 2);

-- Antecedentes Laborales
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000003', 'd1000000-0001-0000-0000-000000000001', 'Empresa anterior', 'texto', NULL, false, 3);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000004', 'd1000000-0001-0000-0000-000000000001', 'Cargo anterior', 'texto', NULL, false, 4);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000005', 'd1000000-0001-0000-0000-000000000001', '¿Ha trabajado en altitud geográfica?', 'radio', '["SI", "NO"]', false, 5);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000006', 'd1000000-0001-0000-0000-000000000001', '¿Dónde trabajó en altitud?', 'texto', '{"items": [], "depende_de": "c1000000-0001-0000-0000-000000000005", "valor_activacion": "SI", "valor_default": ""}', false, 6);

-- Sección: Antecedentes Personales de Salud
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000007', 'd1000000-0001-0000-0000-000000000001', 
'ANTECEDENTES PERSONALES DE SALUD
¿Padece o ha padecido alguna de las siguientes enfermedades?', 'texto_informativo', NULL, false, 7);

-- 26 enfermedades como radio SI/NO
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden) VALUES
('c1000000-0001-0000-0000-000000000010', 'd1000000-0001-0000-0000-000000000001', 'Diabetes', 'radio', '["SI", "NO"]', true, 10),
('c1000000-0001-0000-0000-000000000011', 'd1000000-0001-0000-0000-000000000001', 'Hipertensión Arterial (HTA)', 'radio', '["SI", "NO"]', true, 11),
('c1000000-0001-0000-0000-000000000012', 'd1000000-0001-0000-0000-000000000001', 'Enfermedades Psiquiátricas', 'radio', '["SI", "NO"]', true, 12),
('c1000000-0001-0000-0000-000000000013', 'd1000000-0001-0000-0000-000000000001', 'Tuberculosis (TBC)', 'radio', '["SI", "NO"]', true, 13),
('c1000000-0001-0000-0000-000000000014', 'd1000000-0001-0000-0000-000000000001', 'Enfermedad del Riñón', 'radio', '["SI", "NO"]', true, 14),
('c1000000-0001-0000-0000-000000000015', 'd1000000-0001-0000-0000-000000000001', 'Insuficiencia Cardíaca', 'radio', '["SI", "NO"]', true, 15),
('c1000000-0001-0000-0000-000000000016', 'd1000000-0001-0000-0000-000000000001', 'Infarto / Angina de Pecho', 'radio', '["SI", "NO"]', true, 16),
('c1000000-0001-0000-0000-000000000017', 'd1000000-0001-0000-0000-000000000001', 'Marcapasos', 'radio', '["SI", "NO"]', true, 17),
('c1000000-0001-0000-0000-000000000018', 'd1000000-0001-0000-0000-000000000001', 'Arritmias', 'radio', '["SI", "NO"]', true, 18),
('c1000000-0001-0000-0000-000000000019', 'd1000000-0001-0000-0000-000000000001', 'Enfermedad del Hígado', 'radio', '["SI", "NO"]', true, 19),
('c1000000-0001-0000-0000-000000000020', 'd1000000-0001-0000-0000-000000000001', 'Apneas del Sueño', 'radio', '["SI", "NO"]', true, 20),
('c1000000-0001-0000-0000-000000000021', 'd1000000-0001-0000-0000-000000000001', 'Uso de Anticoagulantes', 'radio', '["SI", "NO"]', true, 21),
('c1000000-0001-0000-0000-000000000022', 'd1000000-0001-0000-0000-000000000001', 'Accidente Cerebrovascular (ACV)', 'radio', '["SI", "NO"]', true, 22),
('c1000000-0001-0000-0000-000000000023', 'd1000000-0001-0000-0000-000000000001', 'Asma', 'radio', '["SI", "NO"]', true, 23),
('c1000000-0001-0000-0000-000000000024', 'd1000000-0001-0000-0000-000000000001', 'Anemia', 'radio', '["SI", "NO"]', true, 24),
('c1000000-0001-0000-0000-000000000025', 'd1000000-0001-0000-0000-000000000001', 'Epilepsia', 'radio', '["SI", "NO"]', true, 25),
('c1000000-0001-0000-0000-000000000026', 'd1000000-0001-0000-0000-000000000001', 'Cáncer', 'radio', '["SI", "NO"]', true, 26),
('c1000000-0001-0000-0000-000000000027', 'd1000000-0001-0000-0000-000000000001', 'Bronquitis Crónica', 'radio', '["SI", "NO"]', true, 27),
('c1000000-0001-0000-0000-000000000028', 'd1000000-0001-0000-0000-000000000001', 'Vértigo / Mareos', 'radio', '["SI", "NO"]', true, 28),
('c1000000-0001-0000-0000-000000000029', 'd1000000-0001-0000-0000-000000000001', 'Várices', 'radio', '["SI", "NO"]', true, 29),
('c1000000-0001-0000-0000-000000000030', 'd1000000-0001-0000-0000-000000000001', 'Traumatismo Encéfalo Craneano (TEC)', 'radio', '["SI", "NO"]', true, 30),
('c1000000-0001-0000-0000-000000000031', 'd1000000-0001-0000-0000-000000000001', 'Edema Pulmonar de Altitud', 'radio', '["SI", "NO"]', true, 31),
('c1000000-0001-0000-0000-000000000032', 'd1000000-0001-0000-0000-000000000001', 'Edema Cerebral de Altitud', 'radio', '["SI", "NO"]', true, 32),
('c1000000-0001-0000-0000-000000000033', 'd1000000-0001-0000-0000-000000000001', 'Enfermedad Reumática', 'radio', '["SI", "NO"]', true, 33),
('c1000000-0001-0000-0000-000000000034', 'd1000000-0001-0000-0000-000000000001', 'Alcoholismo', 'radio', '["SI", "NO"]', true, 34),
('c1000000-0001-0000-0000-000000000035', 'd1000000-0001-0000-0000-000000000001', 'Drogadicción', 'radio', '["SI", "NO"]', true, 35);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000036', 'd1000000-0001-0000-0000-000000000001', 'Otras enfermedades (especifique)', 'texto_largo', NULL, false, 36);

-- Fármacos
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000040', 'd1000000-0001-0000-0000-000000000001', '¿Consume fármacos actualmente?', 'radio', '["SI", "NO"]', true, 40);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000041', 'd1000000-0001-0000-0000-000000000001', 'Medicamento y causa', 'texto_largo', '{"items": [], "depende_de": "c1000000-0001-0000-0000-000000000040", "valor_activacion": "SI", "valor_default": ""}', false, 41);

-- Hábitos
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000042', 'd1000000-0001-0000-0000-000000000001', '¿Fuma tabaco?', 'radio', '["SI", "NO"]', true, 42);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000043', 'd1000000-0001-0000-0000-000000000001', 'Frecuencia y cantidad de tabaco', 'texto', '{"items": [], "depende_de": "c1000000-0001-0000-0000-000000000042", "valor_activacion": "SI", "valor_default": ""}', false, 43);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000044', 'd1000000-0001-0000-0000-000000000001', '¿Consume alcohol?', 'radio', '["SI", "NO"]', true, 44);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000045', 'd1000000-0001-0000-0000-000000000001', 'Frecuencia y cantidad de alcohol', 'texto', '{"items": [], "depende_de": "c1000000-0001-0000-0000-000000000044", "valor_activacion": "SI", "valor_default": ""}', false, 45);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000046', 'd1000000-0001-0000-0000-000000000001', '¿Consume drogas?', 'radio', '["SI", "NO"]', true, 46);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000047', 'd1000000-0001-0000-0000-000000000001', 'Frecuencia y tipo de drogas', 'texto', '{"items": [], "depende_de": "c1000000-0001-0000-0000-000000000046", "valor_activacion": "SI", "valor_default": ""}', false, 47);

-- Alergias
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000048', 'd1000000-0001-0000-0000-000000000001', '¿Tiene alergias?', 'radio', '["SI", "NO"]', true, 48);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000049', 'd1000000-0001-0000-0000-000000000001', 'Detalle de alergias', 'texto_largo', '{"items": [], "depende_de": "c1000000-0001-0000-0000-000000000048", "valor_activacion": "SI", "valor_default": ""}', false, 49);

-- Cirugías
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000050', 'd1000000-0001-0000-0000-000000000001', 'Cirugías u hospitalizaciones previas', 'texto_largo', NULL, false, 50);

-- Antecedentes Familiares
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000051', 'd1000000-0001-0000-0000-000000000001', 'Antecedentes familiares de enfermedades', 'texto_largo', NULL, false, 51);

-- Antecedentes laborales
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000052', 'd1000000-0001-0000-0000-000000000001', 'Enfermedades o accidentes laborales previos (enfermedad/accidente, año, mutualidad)', 'texto_largo', NULL, false, 52);

-- Sección mujer
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000053', 'd1000000-0001-0000-0000-000000000001', 
'SECCIÓN SOLO PARA MUJERES (si no aplica, dejar en blanco)', 'texto_informativo', NULL, false, 53);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000054', 'd1000000-0001-0000-0000-000000000001', '¿Existe posibilidad de embarazo?', 'radio', '["SI", "NO", "No aplica"]', false, 54);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000055', 'd1000000-0001-0000-0000-000000000001', 'Fecha última menstruación', 'fecha', NULL, false, 55);

-- Texto declarativo
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000056', 'd1000000-0001-0000-0000-000000000001', 
'Declaro que la información proporcionada en este documento es verdadera y completa. Entiendo que ocultar información relevante sobre mi estado de salud puede poner en riesgo mi seguridad y la de terceros en mi lugar de trabajo.', 'texto_informativo', NULL, false, 56);

-- Firma obligatoria
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c1000000-0001-0000-0000-000000000057', 'd1000000-0001-0000-0000-000000000001', 'FIRMA DEL TRABAJADOR', 'firma', NULL, true, 57);


-- =====================================================
-- DOCUMENTO 2: CONSENTIMIENTO INFORMADO ALCOHOL Y DROGAS
-- =====================================================
INSERT INTO documentos_formularios (id, nombre, descripcion, tipo, activo)
VALUES ('d1000000-0002-0000-0000-000000000001', 'CONSENTIMIENTO INFORMADO ALCOHOL Y DROGAS', 'Consentimiento informado para examen de alcohol y drogas', 'consentimiento', true);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c2000000-0001-0000-0000-000000000001', 'd1000000-0002-0000-0000-000000000001',
'CONSENTIMIENTO INFORMADO PARA EXAMEN DE ALCOHOL Y DROGAS

Yo, {{nombre}}, RUT {{rut}}, Edad {{edad}}, con domicilio en {{direccion}}, declaro haber sido informado(a) de lo siguiente:

1. La toma de muestra de orina será supervisada por personal autorizado de Centro Médico Jenner.
2. La prueba de drogas en orina es una prueba cualitativa presuntiva que indica presencia o ausencia de sustancias.
3. En caso de resultado positivo, la muestra será enviada a un laboratorio de referencia para confirmación.
4. Los resultados serán informados a la empresa {{empresa}} según lo autorizado.', 'texto_informativo', NULL, false, 1);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c2000000-0001-0000-0000-000000000002', 'd1000000-0002-0000-0000-000000000001', '¿Acepta voluntariamente someterse al examen de alcohol y drogas?', 'radio', '["SI, acepto voluntariamente", "NO acepto"]', true, 2);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c2000000-0001-0000-0000-000000000003', 'd1000000-0002-0000-0000-000000000001', '¿Toma medicamentos actualmente?', 'radio', '["SI", "NO"]', true, 3);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c2000000-0001-0000-0000-000000000004', 'd1000000-0002-0000-0000-000000000001', 'Detalle de medicamentos que consume', 'texto_largo', '{"items": [], "depende_de": "c2000000-0001-0000-0000-000000000003", "valor_activacion": "SI", "valor_default": ""}', false, 4);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c2000000-0001-0000-0000-000000000005', 'd1000000-0002-0000-0000-000000000001', 'FIRMA DEL TRABAJADOR', 'firma', NULL, true, 5);


-- =====================================================
-- DOCUMENTO 3: ESCALA DE SOMNOLENCIA DE EPWORTH
-- =====================================================
INSERT INTO documentos_formularios (id, nombre, descripcion, tipo, activo)
VALUES ('d1000000-0003-0000-0000-000000000001', 'ESCALA DE SOMNOLENCIA DE EPWORTH', 'Cuestionario para evaluar la somnolencia diurna del paciente', 'cuestionario', true);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c3000000-0001-0000-0000-000000000001', 'd1000000-0003-0000-0000-000000000001',
'ESCALA DE SOMNOLENCIA DE EPWORTH

Nombre: {{nombre}}  |  RUT: {{rut}}  |  Edad: {{edad}}  |  Empresa: {{empresa}}

¿Con qué frecuencia se queda dormido(a) o tiene sueño en las siguientes situaciones? Incluso si no ha realizado recientemente alguna de estas actividades, intente imaginar cómo le afectarían.

Use la siguiente escala para elegir el número más apropiado para cada situación:
0 = Ninguna posibilidad de dormitar
1 = Leve posibilidad de dormitar
2 = Moderada posibilidad de dormitar
3 = Alta posibilidad de dormitar', 'texto_informativo', NULL, false, 1);

-- 8 preguntas Epworth
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden) VALUES
('c3000000-0001-0000-0000-000000000010', 'd1000000-0003-0000-0000-000000000001', 'Sentado leyendo', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 10),
('c3000000-0001-0000-0000-000000000011', 'd1000000-0003-0000-0000-000000000001', 'Mirando televisión', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 11),
('c3000000-0001-0000-0000-000000000012', 'd1000000-0003-0000-0000-000000000001', 'Sentado inactivo en un lugar público (ej: cine, reunión)', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 12),
('c3000000-0001-0000-0000-000000000013', 'd1000000-0003-0000-0000-000000000001', 'Como pasajero de un auto durante 1 hora sin parar', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 13),
('c3000000-0001-0000-0000-000000000014', 'd1000000-0003-0000-0000-000000000001', 'Acostado descansando en la tarde', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 14),
('c3000000-0001-0000-0000-000000000015', 'd1000000-0003-0000-0000-000000000001', 'Sentado conversando con alguien', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 15),
('c3000000-0001-0000-0000-000000000016', 'd1000000-0003-0000-0000-000000000001', 'Sentado tranquilo después de almuerzo (sin alcohol)', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 16),
('c3000000-0001-0000-0000-000000000017', 'd1000000-0003-0000-0000-000000000001', 'Manejando un auto detenido por tráfico o semáforo', 'radio', '["0 - Ninguna posibilidad", "1 - Leve posibilidad", "2 - Moderada posibilidad", "3 - Alta posibilidad"]', true, 17);

-- Puntaje Epworth
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c3000000-0001-0000-0000-000000000020', 'd1000000-0003-0000-0000-000000000001', 'PUNTAJE TOTAL EPWORTH', 'puntaje', '{"campos_suma": ["c3000000-0001-0000-0000-000000000010", "c3000000-0001-0000-0000-000000000011", "c3000000-0001-0000-0000-000000000012", "c3000000-0001-0000-0000-000000000013", "c3000000-0001-0000-0000-000000000014", "c3000000-0001-0000-0000-000000000015", "c3000000-0001-0000-0000-000000000016", "c3000000-0001-0000-0000-000000000017"]}', false, 20);

-- Firma Epworth
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c3000000-0001-0000-0000-000000000021', 'd1000000-0003-0000-0000-000000000001', 'FIRMA DEL TRABAJADOR', 'firma', NULL, true, 21);


-- =====================================================
-- DOCUMENTO 4: ENCUESTA DE LAKE LOUIS MODIFICADA
-- =====================================================
INSERT INTO documentos_formularios (id, nombre, descripcion, tipo, activo)
VALUES ('d1000000-0004-0000-0000-000000000001', 'ENCUESTA DE LAKE LOUIS MODIFICADA', 'Evaluación de síntomas de mal agudo de montaña', 'cuestionario', true);

-- Texto informativo
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000001', 'd1000000-0004-0000-0000-000000000001',
'ENCUESTA DE LAKE LOUIS MODIFICADA
Evaluación de Mal Agudo de Montaña

Nombre: {{nombre}}  |  RUT: {{rut}}  |  Edad: {{edad}}  |  Empresa: {{empresa}}
Fecha: {{fecha_actual}}', 'texto_informativo', NULL, false, 1);

-- Sección Experiencia en Altitud
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000002', 'd1000000-0004-0000-0000-000000000001',
'EXPERIENCIA EN GRAN ALTITUD', 'texto_informativo', NULL, false, 2);

-- Pregunta gatillo
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000003', 'd1000000-0004-0000-0000-000000000001', '¿Ha estado alguna vez sobre los 3000 metros de altitud?', 'radio', '["SI", "NO"]', true, 3);

-- Campos condicionales de experiencia (dependen de pregunta gatillo = SI)
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000004', 'd1000000-0004-0000-0000-000000000001', '¿Dónde? (lugar)', 'texto', '{"items": [], "depende_de": "c4000000-0001-0000-0000-000000000003", "valor_activacion": "SI", "valor_default": ""}', false, 4);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000005', 'd1000000-0004-0000-0000-000000000001', '¿Año?', 'texto', '{"items": [], "depende_de": "c4000000-0001-0000-0000-000000000003", "valor_activacion": "SI", "valor_default": ""}', false, 5);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000006', 'd1000000-0004-0000-0000-000000000001', 'Tipo de exposición', 'radio', '{"items": ["Intermitente", "Esporádica", "Permanente"], "depende_de": "c4000000-0001-0000-0000-000000000003", "valor_activacion": "SI", "valor_default": ""}', false, 6);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000007', 'd1000000-0004-0000-0000-000000000001', 'Altitud máxima alcanzada (lugar, altitud, tiempo)', 'texto', '{"items": [], "depende_de": "c4000000-0001-0000-0000-000000000003", "valor_activacion": "SI", "valor_default": ""}', false, 7);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000008', 'd1000000-0004-0000-0000-000000000001', 'Último ascenso (año, altitud, lugar, tipo exposición)', 'texto', '{"items": [], "depende_de": "c4000000-0001-0000-0000-000000000003", "valor_activacion": "SI", "valor_default": ""}', false, 8);

-- Sección Síntomas
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000009', 'd1000000-0004-0000-0000-000000000001',
'SÍNTOMAS
Indique la intensidad de cada síntoma que haya experimentado:', 'texto_informativo', NULL, false, 9);

-- 5 síntomas con escala 0-3
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden) VALUES
('c4000000-0001-0000-0000-000000000010', 'd1000000-0004-0000-0000-000000000001', 'Dolor de cabeza', 'radio', '["0 - Sin dolor", "1 - Dolor leve", "2 - Dolor moderado", "3 - Dolor severo, incapacitante"]', true, 10),
('c4000000-0001-0000-0000-000000000011', 'd1000000-0004-0000-0000-000000000001', 'Disminución del apetito, náuseas o vómitos', 'radio', '["0 - Sin síntomas", "1 - Poco apetito o náuseas leves", "2 - Náuseas/vómitos moderados", "3 - Náuseas/vómitos severos, incapacitantes"]', true, 11),
('c4000000-0001-0000-0000-000000000012', 'd1000000-0004-0000-0000-000000000001', 'Fatiga o debilidad', 'radio', '["0 - Sin fatiga", "1 - Fatiga leve", "2 - Fatiga moderada", "3 - Fatiga severa, incapacitante"]', true, 12),
('c4000000-0001-0000-0000-000000000013', 'd1000000-0004-0000-0000-000000000001', 'Mareo o vértigo', 'radio', '["0 - Sin mareo", "1 - Mareo leve", "2 - Mareo moderado", "3 - Mareo severo, incapacitante"]', true, 13),
('c4000000-0001-0000-0000-000000000014', 'd1000000-0004-0000-0000-000000000001', 'Dificultad para dormir', 'radio', '["0 - Sin dificultad", "1 - Dificultad leve", "2 - Dificultad moderada", "3 - No pudo dormir"]', true, 14);

INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000015', 'd1000000-0004-0000-0000-000000000001', 'Otros síntomas (especifique)', 'texto', NULL, false, 15);

-- Puntaje síntomas Lake Louis
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000020', 'd1000000-0004-0000-0000-000000000001', 'PUNTAJE TOTAL SÍNTOMAS', 'puntaje', '{"campos_suma": ["c4000000-0001-0000-0000-000000000010", "c4000000-0001-0000-0000-000000000011", "c4000000-0001-0000-0000-000000000012", "c4000000-0001-0000-0000-000000000013", "c4000000-0001-0000-0000-000000000014"]}', false, 20);

-- Preguntas condicionales (se deshabilitan si puntaje de síntomas = 0)
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden) VALUES
('c4000000-0001-0000-0000-000000000021', 'd1000000-0004-0000-0000-000000000001', '¿Requirió atención médica?', 'radio', '{"items": ["SI", "NO"], "depende_de_puntaje": ["c4000000-0001-0000-0000-000000000010", "c4000000-0001-0000-0000-000000000011", "c4000000-0001-0000-0000-000000000012", "c4000000-0001-0000-0000-000000000013", "c4000000-0001-0000-0000-000000000014"], "puntaje_activacion": 0, "valor_default": "NO"}', false, 21),
('c4000000-0001-0000-0000-000000000022', 'd1000000-0004-0000-0000-000000000001', '¿Requirió descenso?', 'radio', '{"items": ["SI", "NO"], "depende_de_puntaje": ["c4000000-0001-0000-0000-000000000010", "c4000000-0001-0000-0000-000000000011", "c4000000-0001-0000-0000-000000000012", "c4000000-0001-0000-0000-000000000013", "c4000000-0001-0000-0000-000000000014"], "puntaje_activacion": 0, "valor_default": "NO"}', false, 22),
('c4000000-0001-0000-0000-000000000023', 'd1000000-0004-0000-0000-000000000001', '¿Requirió hospitalización?', 'radio', '{"items": ["SI", "NO"], "depende_de_puntaje": ["c4000000-0001-0000-0000-000000000010", "c4000000-0001-0000-0000-000000000011", "c4000000-0001-0000-0000-000000000012", "c4000000-0001-0000-0000-000000000013", "c4000000-0001-0000-0000-000000000014"], "puntaje_activacion": 0, "valor_default": "NO"}', false, 23),
('c4000000-0001-0000-0000-000000000024', 'd1000000-0004-0000-0000-000000000001', '¿Ha hecho ascensos posteriores?', 'radio', '{"items": ["SI", "NO"], "depende_de_puntaje": ["c4000000-0001-0000-0000-000000000010", "c4000000-0001-0000-0000-000000000011", "c4000000-0001-0000-0000-000000000012", "c4000000-0001-0000-0000-000000000013", "c4000000-0001-0000-0000-000000000014"], "puntaje_activacion": 0, "valor_default": "NO"}', false, 24),
('c4000000-0001-0000-0000-000000000025', 'd1000000-0004-0000-0000-000000000001', '¿Usa premedicación para altitud?', 'radio', '{"items": ["SI", "NO"], "depende_de_puntaje": ["c4000000-0001-0000-0000-000000000010", "c4000000-0001-0000-0000-000000000011", "c4000000-0001-0000-0000-000000000012", "c4000000-0001-0000-0000-000000000013", "c4000000-0001-0000-0000-000000000014"], "puntaje_activacion": 0, "valor_default": "NO"}', false, 25);

-- Firma Lake Louis
INSERT INTO documento_campos (id, documento_id, etiqueta, tipo_campo, opciones, requerido, orden)
VALUES ('c4000000-0001-0000-0000-000000000030', 'd1000000-0004-0000-0000-000000000001', 'FIRMA DEL TRABAJADOR', 'firma', NULL, true, 30);
