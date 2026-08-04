import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React from "react";
import z from "zod/v4";
import "./styles.css";

const propSchema = z.object({
  daysBack: z.number().default(7).describe("Number of days back to show incidents"),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display Supabase service status and recent incidents from the status page",
  props: propSchema,
  exposeAsTool: true,
  annotations: { readOnlyHint: true },
  appsSdkMetadata: {
    "openai/widgetCSP": {
      connect_domains: ["https://status.supabase.com"],
      resource_domains: ["https://*.supabase.com"],
    },
  },
};

const SupabaseStatusWidget: React.FC = () => {
  const { props } = useWidget<z.infer<typeof propSchema>>();

  return (
    <McpUseProvider viewControls="fullscreen" autoSize>
      <div className="card">
        <h2>Supabase Status</h2>
        <p>Last {props.daysBack} days</p>
      </div>
    </McpUseProvider>
  );
};

export default SupabaseStatusWidget;
