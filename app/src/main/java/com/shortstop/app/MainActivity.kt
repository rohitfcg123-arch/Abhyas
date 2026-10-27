package com.shortstop.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        render()
    }

    override fun onResume() {
        super.onResume()
        if (::status.isInitialized) updateStatus()
    }

    private fun render() {
        val pad = (24 * resources.displayMetrics.density).toInt()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(pad, pad * 2, pad, pad)
        }
        val title = TextView(this).apply {
            text = "ShortStop"
            textSize = 30f
            setTextColor(0xFF182230.toInt())
            gravity = Gravity.CENTER
        }
        val subtitle = TextView(this).apply {
            text = "Take back your attention."
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, pad / 3, 0, pad)
        }
        status = TextView(this).apply {
            textSize = 17f
            gravity = Gravity.CENTER
            setPadding(0, pad, 0, pad)
        }
        val enable = Button(this).apply {
            text = "Enable Shorts blocking"
            setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }
        val refresh = Button(this).apply {
            text = "Refresh status"
            setOnClickListener { updateStatus() }
        }
        val note = TextView(this).apply {
            text = "How it works\nShortStop checks accessibility labels on YouTube. If it recognises a likely Shorts feed, it presses Back. Normal videos should remain available. YouTube updates can affect detection."
            textSize = 14f
            setPadding(0, pad, 0, 0)
        }
        layout.addView(title, fullWidth())
        layout.addView(subtitle, fullWidth())
        layout.addView(status, fullWidth())
        layout.addView(enable, fullWidth())
        layout.addView(refresh, fullWidth())
        layout.addView(note, fullWidth())
        setContentView(layout)
        updateStatus()
    }

    private fun fullWidth() = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    )

    private fun updateStatus() {
        if (!::status.isInitialized) return
        status.text = if (isServiceEnabled()) "Status: BLOCKER ENABLED"
        else "Status: NOT ENABLED\nTap below, find ShortStop, and switch it on."
    }

    private fun isServiceEnabled(): Boolean {
        val expected = packageName + "/" + ShortsBlockerService::class.java.name
        val enabled = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabled)
        while (splitter.hasNext()) {
            if (splitter.next().equals(expected, ignoreCase = true)) return true
        }
        return false
    }
}
