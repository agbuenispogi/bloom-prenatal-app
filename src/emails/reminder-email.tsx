import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

// Email in the journal's voice: oat paper, serif heading, one satin action. Inline styles (email clients).
const paper = "#f4ecdf";
const ink = "#3b2b2a";
const soft = "#6b5650";
const satin = "#8c2f55";
const serif = "'Young Serif', Georgia, 'Times New Roman', serif";
const sans = "'Atkinson Hyperlegible Next', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export interface ReminderEmailProps {
  kind: "due" | "escalation" | string;
  recipientName: string;
  title: string;
  body: string;
  appUrl: string;
  calendarUrl: string | null;
}

export function ReminderEmail({ kind, recipientName, title, body, appUrl, calendarUrl }: ReminderEmailProps) {
  const isEscalation = kind === "escalation";
  return (
    <Html lang="en">
      <Head />
      <Preview>{body}</Preview>
      <Body style={{ backgroundColor: paper, margin: 0, padding: "24px 0", fontFamily: sans, color: ink }}>
        <Container style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
          <Text style={{ fontFamily: serif, fontSize: 18, margin: "0 0 24px", color: soft }}>Bloom</Text>
          <Heading as="h1" style={{ fontFamily: serif, fontWeight: 400, fontSize: 30, lineHeight: "1.15", margin: "0 0 12px", color: ink }}>
            {title}
          </Heading>
          <Text style={{ fontSize: 17, lineHeight: "1.5", margin: "0 0 8px" }}>{body}</Text>
          {isEscalation ? (
            <Text style={{ fontSize: 16, lineHeight: "1.5", color: soft, margin: "0 0 20px" }}>
              Hi {recipientName}, a gentle heads-up in case it slipped by. A kind check-in helps more than a reminder.
            </Text>
          ) : null}
          <Section style={{ margin: "24px 0" }}>
            <Button href={appUrl} style={{ backgroundColor: satin, color: "#fff6f2", fontSize: 17, fontWeight: 600, padding: "16px 24px", borderRadius: 10, display: "block", textAlign: "center" }}>
              Open Bloom
            </Button>
          </Section>
          {calendarUrl ? (
            <Text style={{ fontSize: 15, margin: "0 0 24px" }}>
              <Link href={calendarUrl} style={{ color: ink, textDecoration: "underline" }}>
                Add this to my calendar
              </Link>{" "}
              <span style={{ color: soft }}>for a phone alarm</span>
            </Text>
          ) : null}
          <Hr style={{ borderColor: "#d6c6ad", margin: "24px 0 12px" }} />
          <Text style={{ fontSize: 13, color: soft, margin: 0 }}>Bloom is a reminder and logging tool, not medical advice. Changes to the regimen come from the OB.</Text>
        </Container>
      </Body>
    </Html>
  );
}
