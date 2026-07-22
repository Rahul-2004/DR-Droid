import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { paddingTop: 54, paddingBottom: 48, paddingHorizontal: 52, fontSize: 10, fontFamily: "Helvetica", color: "#172033", lineHeight: 1.5 },
  accent: { width: 44, height: 4, marginBottom: 18, backgroundColor: "#7c3aed" },
  title: { fontSize: 25, lineHeight: 1.2, marginBottom: 8, fontFamily: "Helvetica-Bold", color: "#111827" },
  meta: { fontSize: 8, marginBottom: 26, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  heading1: { fontSize: 17, marginTop: 17, marginBottom: 8, fontFamily: "Helvetica-Bold", color: "#312e81" },
  heading2: { fontSize: 13, marginTop: 13, marginBottom: 6, fontFamily: "Helvetica-Bold", color: "#312e81" },
  paragraph: { marginBottom: 7 },
  bullet: { marginBottom: 4, paddingLeft: 10 },
  table: { marginBottom: 5, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: "#f4f4f5", fontFamily: "Courier" },
  footer: { position: "absolute", bottom: 22, left: 52, right: 52, fontSize: 8, color: "#9ca3af", textAlign: "right" },
});

function cleanMarkdown(value: string) {
  return value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 — $2").replace(/[*_`]/g, "");
}

export function ResearchReportPdf({ title, content }: { title: string; content: string }) {
  const lines = content.split("\n");
  return <Document title={title} author="MicroManus"><Page size="A4" style={styles.page}><View style={styles.accent}/><Text style={styles.title}>{title}</Text><Text style={styles.meta}>MicroManus research report · {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Text>{lines.map((line, index) => {
    const value = line.trim();
    if (!value) return null;
    if (value.startsWith("# ")) return <Text key={index} style={styles.heading1}>{cleanMarkdown(value.slice(2))}</Text>;
    if (value.startsWith("## ")) return <Text key={index} style={styles.heading1}>{cleanMarkdown(value.slice(3))}</Text>;
    if (value.startsWith("### ")) return <Text key={index} style={styles.heading2}>{cleanMarkdown(value.slice(4))}</Text>;
    if (/^[-*]\s/.test(value)) return <Text key={index} style={styles.bullet}>• {cleanMarkdown(value.slice(2))}</Text>;
    if (value.startsWith("|")) return <Text key={index} style={styles.table}>{cleanMarkdown(value)}</Text>;
    return <Text key={index} style={styles.paragraph}>{cleanMarkdown(value)}</Text>;
  })}<Text fixed style={styles.footer} render={({ pageNumber, totalPages }) => `MicroManus · ${pageNumber} / ${totalPages}`}/></Page></Document>;
}
