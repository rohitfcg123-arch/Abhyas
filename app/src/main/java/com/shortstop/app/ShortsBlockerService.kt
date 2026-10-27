package com.shortstop.app

import android.accessibilityservice.AccessibilityService
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class ShortsBlockerService : AccessibilityService() {
    private var lastBlockedAt = 0L
    private var lastSignature = ""

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || event.packageName?.toString() != YOUTUBE_PACKAGE) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val root = rootInActiveWindow ?: return
        val labels = mutableListOf<String>()
        collectLabels(root, labels, 0)
        val normalised = labels.map { it.lowercase().trim() }.filter { it.isNotBlank() }
        val signature = normalised.filter {
            it.contains("short") || it.contains("remix") || it.contains("sound") ||
            it.contains("comment") || it.contains("dislike") || it.contains("like")
        }.sorted().joinToString("|")

        val hasShortsEvidence = normalised.any {
            it == "shorts" || it.contains("shorts video") ||
            it.contains("remix") || it.contains("use this sound") || it.contains("add sound")
        }
        val hasVerticalActions = listOf("comments", "dislike", "share").count { token ->
            normalised.any { it.contains(token) }
        } >= 2
        val hasRemixAction = normalised.any { it.contains("remix") || it.contains("use this sound") }
        val looksLikeShorts = hasShortsEvidence && hasVerticalActions &&
            (hasRemixAction || normalised.any { it.contains("shorts video") })

        val now = SystemClock.elapsedRealtime()
        if (looksLikeShorts && now - lastBlockedAt > 1400 && signature != lastSignature) {
            lastBlockedAt = now
            lastSignature = signature
            performGlobalAction(GLOBAL_ACTION_BACK)
        }
    }

    private fun collectLabels(node: AccessibilityNodeInfo?, out: MutableList<String>, depth: Int) {
        if (node == null || depth > 18 || out.size > 500) return
        node.text?.toString()?.let { out.add(it) }
        node.contentDescription?.toString()?.let { out.add(it) }
        for (i in 0 until node.childCount) collectLabels(node.getChild(i), out, depth + 1)
    }

    override fun onInterrupt() = Unit

    companion object {
        private const val YOUTUBE_PACKAGE = "com.google.android.youtube"
    }
}
