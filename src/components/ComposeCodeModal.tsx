import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Folder, Terminal } from 'lucide-react';

interface ComposeCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface KotlinFile {
  name: string;
  path: string;
  content: string;
}

const kotlinFiles: KotlinFile[] = [
  {
    name: 'Theme.kt',
    path: 'com/safeplant/aiot/ui/theme/Theme.kt',
    content: `package com.safeplant.aiot.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// SafePlant Custom Material 3 Industrial Dark Color Scheme
private val SafePlantDarkColorScheme = darkColorScheme(
    primary = ElectricLime,
    onPrimary = IndustrialBlack,
    primaryContainer = ElectricLimeDark,
    onPrimaryContainer = ElectricLime,
    secondary = IndustrialCyan,
    onSecondary = IndustrialBlack,
    background = GraphiteCanvas,
    onBackground = Slate100,
    surface = GraphiteSurface,
    onSurface = Slate100,
    surfaceVariant = GraphiteSurfaceVariant,
    onSurfaceVariant = Slate400,
    error = HazardRed,
    onError = IndustrialBlack,
    outline = HairlineBorder
)

@Composable
fun SafePlantTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = SafePlantDarkColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = GraphiteCanvas.toArgb()
            window.navigationBarColor = GraphiteSurface.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = SafePlantTypography,
        shapes = SafePlantShapes,
        content = content
    )
}`
  },
  {
    name: 'Color.kt',
    path: 'com/safeplant/aiot/ui/theme/Color.kt',
    content: `package com.safeplant.aiot.ui.theme

import androidx.compose.ui.graphics.Color

// SafePlant Industrial Identity Palette
val IndustrialBlack = Color(0xFF07090C)
val GraphiteCanvas = Color(0xFF0B0E12)
val GraphiteSurface = Color(0xFF12161E)
val GraphiteSurfaceVariant = Color(0xFF18202C)
val HairlineBorder = Color(0x1AFFFFFF)

// Accent and State Colors
val ElectricLime = Color(0xFF10E575)
val ElectricLimeDark = Color(0xFF0B381E)
val WarningAmber = Color(0xFFF59E0B)
val HazardRed = Color(0xFFEF4444)
val IndustrialCyan = Color(0xFF38BDF8)

// Typography Neutrals
val Slate100 = Color(0xFFF1F5F9)
val Slate300 = Color(0xFFCBD5E1)
val Slate400 = Color(0xFF94A3B8)
val Slate500 = Color(0xFF64748B)`
  },
  {
    name: 'SafePlantLogo.kt',
    path: 'com/safeplant/aiot/ui/components/SafePlantLogo.kt',
    content: `package com.safeplant.aiot.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.ui.theme.ElectricLime

/**
 * Custom Compose Vector Graphic: Shield + Leaf + Industrial Circuit Motif
 */
@Composable
fun SafePlantLogo(
    modifier: Modifier = Modifier,
    sizeDp: Int = 36
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier
    ) {
        Canvas(modifier = Modifier.size(sizeDp.dp)) {
            val w = size.width
            val h = size.height

            // 1. Outer Protective Industrial Shield Path
            val shieldPath = Path().apply {
                moveTo(w * 0.5f, h * 0.08f)
                lineTo(w * 0.88f, h * 0.20f)
                lineTo(w * 0.88f, h * 0.50f)
                cubicTo(w * 0.88f, h * 0.72f, w * 0.70f, h * 0.88f, w * 0.5f, h * 0.95f)
                cubicTo(w * 0.30f, h * 0.88f, w * 0.12f, h * 0.72f, w * 0.12f, h * 0.50f)
                lineTo(w * 0.12f, h * 0.20f)
                close()
            }

            drawPath(
                path = shieldPath,
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFF1E2732), Color(0xFF0C1015))
                )
            )

            drawPath(
                path = shieldPath,
                brush = Brush.linearGradient(
                    colors = listOf(ElectricLime, Color(0xFF2D3A4B), ElectricLime)
                ),
                style = Stroke(width = 3.5f)
            )

            // 2. Leaf and Industrial Circuit Spine
            val leafPath = Path().apply {
                moveTo(w * 0.5f, h * 0.28f)
                cubicTo(w * 0.72f, h * 0.38f, w * 0.70f, h * 0.65f, w * 0.5f, h * 0.75f)
                cubicTo(w * 0.30f, h * 0.65f, w * 0.28f, h * 0.38f, w * 0.5f, h * 0.28f)
                close()
            }
            drawPath(path = leafPath, color = ElectricLime)

            // Circuit Center Line
            drawLine(
                color = Color(0xFF082A16),
                start = Offset(w * 0.5f, h * 0.32f),
                end = Offset(w * 0.5f, h * 0.72f),
                strokeWidth = 3f,
                cap = StrokeCap.Round
            )
        }

        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "Safe",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Plant",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = ElectricLime
                )
            }
            Text(
                text = "AIoT SAFETY SYSTEM",
                fontSize = 9.sp,
                fontFamily = FontFamily.Monospace,
                color = Color(0xFF94A3B8)
            )
        }
    }
}`
  },
  {
    name: 'CustomGauges.kt',
    path: 'com/safeplant/aiot/ui/components/CustomGauges.kt',
    content: `package com.safeplant.aiot.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.safeplant.aiot.data.model.SensorReading
import com.safeplant.aiot.ui.theme.*
import kotlin.math.cos
import kotlin.math.sin

/**
 * 1. Temperature Radial Arc Gauge Composable
 */
@Composable
fun TemperatureArcGauge(
    reading: SensorReading,
    unitSymbol: String = "°C",
    modifier: Modifier = Modifier
) {
    val isCritical = reading.status == SensorStatus.CRITICAL
    val isWarning = reading.status == SensorStatus.WARNING
    val color = if (isCritical) HazardRed else if (isWarning) WarningAmber else ElectricLime

    val minVal = -10f
    val maxVal = 80f
    val ratio = ((reading.value - minVal) / (maxVal - minVal)).coerceIn(0f, 1f)

    Column(
        modifier = modifier
            .background(GraphiteSurface, RoundedCornerShape(16.dp))
            .border(1.dp, HairlineBorder, RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Temperature", fontSize = 12.sp, color = Slate300)
            Text(unitSymbol, fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = Slate400)
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(110.dp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.size(140.dp)) {
                val stroke = 8.dp.toPx()
                val sweep = 240f
                val startAngle = 150f

                // Track Arc
                drawArc(
                    color = Color(0xFF1C2430),
                    startAngle = startAngle,
                    sweepAngle = sweep,
                    useCenter = false,
                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                )

                // Active Progress Arc
                drawArc(
                    color = color,
                    startAngle = startAngle,
                    sweepAngle = sweep * ratio,
                    useCenter = false,
                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                )

                // Needle indicator
                val needleAngleRad = Math.toRadians((startAngle + sweep * ratio).toDouble())
                val center = Offset(size.width / 2, size.height / 2)
                val needleLength = size.width * 0.38f
                val needleEnd = Offset(
                    (center.x + needleLength * cos(needleAngleRad)).toFloat(),
                    (center.y + needleLength * sin(needleAngleRad)).toFloat()
                )
                drawLine(
                    color = Color.White,
                    start = center,
                    end = needleEnd,
                    strokeWidth = 3f,
                    cap = StrokeCap.Round
                )
                drawCircle(color = Color.White, radius = 6f, center = center)
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 18.dp)
            ) {
                Text(
                    text = String.format("%.1f", reading.value),
                    fontSize = 24.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                Text(
                    text = "Threshold: 45°C",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = Slate400
                )
            }
        }
    }
}

/**
 * 2. Gas & Smoke Multi-Segment LED Meter Composable
 */
@Composable
fun GasSmokeLevelMeter(
    reading: SensorReading,
    modifier: Modifier = Modifier
) {
    val totalSegments = 10
    val activeCount = ((reading.value / 500f) * totalSegments).toInt().coerceIn(0, totalSegments)

    Column(
        modifier = modifier
            .background(GraphiteSurface, RoundedCornerShape(16.dp))
            .border(1.dp, HairlineBorder, RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Text("Gas & Smoke", fontSize = 12.sp, color = Slate300)
        Spacer(modifier = Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = "\${reading.value.toInt()}",
                fontSize = 24.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            Text(" PPM", fontSize = 12.sp, fontFamily = FontFamily.Monospace, color = Slate400)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Discrete Segmented Bars
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            for (i in 0 until totalSegments) {
                val active = i < activeCount
                val segmentColor = when {
                    i >= 8 -> HazardRed
                    i >= 6 -> WarningAmber
                    else -> ElectricLime
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(14.dp)
                        .background(
                            if (active) segmentColor else Color(0xFF1C2430),
                            RoundedCornerShape(2.dp)
                        )
                )
            }
        }
    }
}`
  },
  {
    name: 'SafePlantViewModel.kt',
    path: 'com/safeplant/aiot/viewmodel/SafePlantViewModel.kt',
    content: `package com.safeplant.aiot.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.safeplant.aiot.data.model.*
import com.safeplant.aiot.data.repository.SafePlantRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Android Jetpack Compose MVVM ViewModel for SafePlant AIoT
 */
class SafePlantViewModel(
    private val repository: SafePlantRepository = SafePlantRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(SafePlantUiState())
    val uiState: StateFlow<SafePlantUiState> = _uiState.asStateFlow()

    init {
        startTelemetryPolling()
    }

    private fun startTelemetryPolling() {
        viewModelScope.launch {
            repository.observeTelemetry().collect { readings ->
                _uiState.update { current ->
                    current.copy(
                        sensors = readings,
                        systemSafetyState = calculateOverallState(readings),
                        connectionStatus = ConnectionStatus.CONNECTED
                    )
                }
            }
        }
    }

    fun toggleOperatingMode() {
        val newMode = if (_uiState.value.operatingMode == OperatingMode.DEMO) {
            OperatingMode.HARDWARE
        } else {
            OperatingMode.DEMO
        }
        _uiState.update { it.copy(operatingMode = newMode) }
    }

    fun simulateHazard(type: String) {
        viewModelScope.launch {
            repository.injectSimulationHazard(type)
        }
    }

    fun acknowledgeIncident(incidentId: String) {
        _uiState.update { state ->
            val updated = state.incidents.map { inc ->
                if (inc.id == incidentId) inc.copy(acknowledged = true, resolved = true) else inc
            }
            state.copy(incidents = updated)
        }
    }

    private fun calculateOverallState(sensors: List<SensorReading>): SystemSafetyState {
        if (sensors.any { it.status == SensorStatus.CRITICAL }) return SystemSafetyState.CRITICAL
        if (sensors.any { it.status == SensorStatus.WARNING }) return SystemSafetyState.WARNING
        return SystemSafetyState.NOMINAL
    }
}`
  }
];

export const ComposeCodeModal: React.FC<ComposeCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<KotlinFile>(kotlinFiles[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-[#0D1117] rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-[#12161E]">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#10E575]" />
            <div>
              <h2 className="text-sm font-bold text-white">Kotlin & Jetpack Compose Source Code</h2>
              <p className="text-[11px] font-mono text-slate-400">
                Production-Ready Material 3 Android Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2733] hover:bg-[#2A3545] border border-white/10 text-white text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10E575]" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10E575] hover:bg-[#12F07B] text-black text-xs font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .kt</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-Column Editor Layout: File Explorer + Code Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-full md:w-64 bg-[#090C10] border-r border-white/10 p-3 flex flex-col gap-1 overflow-y-auto shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-2 py-1">
              Project Structure
            </span>

            {kotlinFiles.map((file) => (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors ${
                  selectedFile.name === file.name
                    ? 'bg-[#18202A] text-[#10E575] font-semibold border border-[#10E575]/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}

            <div className="mt-4 p-2.5 rounded-xl bg-[#12161F] border border-white/5 text-[11px] font-mono text-slate-400">
              <span className="text-slate-300 font-semibold block mb-1">Android Studio Build</span>
              <span>Compile with Kotlin 1.9.22+, Compose BOM 2024.02.01, Material 3 1.2.0</span>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-[#0B0E14] overflow-hidden">
            {/* File Path Bar */}
            <div className="px-4 py-2 border-b border-white/5 bg-[#0E1218] text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>{selectedFile.path}</span>
              <span className="text-slate-500">Kotlin / Compose</span>
            </div>

            {/* Code Content */}
            <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-slate-200 leading-relaxed selection:bg-[#10E575]/20">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
