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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {siteName} password</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={headerBand}>
            <Heading as="h2" style={brandName}>SifoBooks</Heading>
            <Text style={brandTag}>Password reset</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Reset your password</Heading>
            <Text style={text}>
              We received a request to reset the password for your {siteName} account.
              Click the button below to choose a new password. This link expires in 1 hour.
            </Text>
            <Button style={button} href={confirmationUrl}>
              Reset password
            </Button>
            <Hr style={divider} />
            <Text style={footerStrong}>Didn't ask for this?</Text>
            <Text style={footer}>
              If you didn't request a password reset, you can safely ignore this email —
              your password will remain unchanged.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default RecoveryEmail
