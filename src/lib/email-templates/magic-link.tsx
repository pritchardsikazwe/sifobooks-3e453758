import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import {
  body,
  brandName,
  brandTag,
  button,
  container,
  divider,
  footer,
  footerStrong,
  h1,
  headerBand,
  main,
  text,
  wrapper,
} from './_shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} sign-in link</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={headerBand}>
            <Heading as="h2" style={brandName}>SifoBooks</Heading>
            <Text style={brandTag}>Secure sign-in link</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Your sign-in link</Heading>
            <Text style={text}>
              Click the button below to sign in to {siteName}. For your security,
              this link expires shortly and can only be used once.
            </Text>
            <Button style={button} href={confirmationUrl}>
              Sign in to SifoBooks
            </Button>
            <Hr style={divider} />
            <Text style={footerStrong}>Didn't request this?</Text>
            <Text style={footer}>
              If you didn't try to sign in, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default MagicLinkEmail
