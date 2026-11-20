---
"dotquilt": patch
"@dotquilt/react": patch
---

Chart handoffs keep their marks at full strength while they land on the line. A region with a chart placeholder used to fade its whole placeholder layer across the handoff, so the marks reached the line at half strength or less; now the layer holds until the chart's own marks have left, and lets go only in the last tenth of the handoff.
