import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from "react-email";
import * as React from "react";

interface WinnerNotificationProps {
  winnerName: string;
  tier: number;
  prize: string;
  drawDate: string;
  winningNumbers: number[];
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const WinnerNotification = ({
  winnerName,
  tier,
  prize,
  drawDate,
  winningNumbers,
}: WinnerNotificationProps) => (
  <Html>
    <Head />
    <Preview>You're a winner! Congratulations on your prize.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/logo.png`}
          width="48"
          height="48"
          alt="Digital Heroes Logo"
        />
        <Heading style={heading}>Congratulations, {winnerName}!</Heading>
        <Text style={paragraph}>
          We are thrilled to inform you that you are a winner in our recent
          draw held on {drawDate}.
        </Text>
        <Text style={paragraph}>
          Your entry was a <strong>Tier {tier}</strong> winner, securing you a
          prize of <strong>{prize}</strong>!
        </Text>
        <Text style={paragraph}>
          The winning numbers for this draw were:{" "}
          <strong>{winningNumbers.join(", ")}</strong>.
        </Text>
        <Text style={paragraph}>
          You can view the full draw details and your prize information by
          logging into your account.
        </Text>
        <Link href={baseUrl} style={button}>
          Go to Dashboard
        </Link>
        <Text style={footer}>
          Thanks for playing and supporting great causes.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default WinnerNotification;

const main = {
  backgroundColor: "#f6f9fc",
  padding: "10px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0f0f0",
  padding: "45px",
};

const heading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#484848",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.4",
  color: "#484848",
};

const button = {
  backgroundColor: "#0070f3",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "210px",
  padding: "14px 7px",
};

const footer = {
  color: "#666",
  fontSize: "12px",
  lineHeight: "1.4",
  marginTop: "20px",
};
