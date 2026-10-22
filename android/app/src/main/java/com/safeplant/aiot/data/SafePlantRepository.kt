package com.safeplant.aiot.data

import android.content.Context
import android.util.Log
import com.safeplant.aiot.data.model.*
import com.safeplant.aiot.network.AcknowledgeDto
import com.safeplant.aiot.network.ResolveDto
import com.safeplant.aiot.network.SafePlantApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant

private const val TAG = "SafePlantRepository"

class SafePlantRepository(
    private var baseUrl: String = "http://10.0.2.2:8000"
) {
    private var apiService: SafePlantApiService = SafePlantApiService.create(baseUrl)

    fun updateBaseUrl(newUrl: String) {
        baseUrl = newUrl
        apiService = SafePlantApiService.create(newUrl)
    }

    suspend fun reportAiIntrusionEvent(
        polygonId: String,
        peopleCount: Int,
        confidence: Float,
        source: String = "android_camera",
        isHardware: Boolean = false,
        timestamp: String = Instant.now().toString()
    ): Result<Map<String, Any>> = withContext(Dispatchers.IO) {
        try {
            val payload = mapOf(
                "polygon_id" to polygonId,
                "people_count" to peopleCount,
                "confidence" to confidence,
                "timestamp" to timestamp,
                "source" to source,
                "is_hardware" to isHardware
            )
            val response = apiService.reportAiEvent(payload)
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = response.errorBody()?.string() ?: "HTTP ${response.code()}"
                Log.w(TAG, "reportAiIntrusionEvent failed: $errorMsg")
                Result.failure(Exception("Server returned $errorMsg"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network error posting AI event: ${e.message}", e)
            Result.failure(e)
        }
    }

    suspend fun getAiEvents(): Result<List<Map<String, Any>>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.getAiEvents()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to load AI events: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun acknowledgeIncident(incidentId: String, by: String = "Plant Safety Officer"): Result<Map<String, Any>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.acknowledgeIncident(incidentId, AcknowledgeDto(by))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to acknowledge: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resolveIncident(incidentId: String, notes: String): Result<Map<String, Any>> = withContext(Dispatchers.IO) {
        try {
            val response = apiService.resolveIncident(incidentId, ResolveDto(notes))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                Result.failure(Exception("Failed to resolve: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    companion object {
        @Volatile
        private var instance: SafePlantRepository? = null

        fun getInstance(baseUrl: String = "http://10.0.2.2:8000"): SafePlantRepository {
            return instance ?: synchronized(this) {
                instance ?: SafePlantRepository(baseUrl).also { instance = it }
            }
        }
    }
}
