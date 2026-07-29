import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
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
  link,
  main,
  text,
  wrapper,
} from './_shared'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your new {siteName} email address</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={headerBand}>
            <Heading as="h2" style={brandName}>SifoBooks</Heading>
            <Text style={brandTag}>Email change confirmation</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Confirm your new email</Heading>
            <Text style={text}>
              You requested to change the email on your {siteName} account from{' '}
              <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
              to{' '}
              <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
              Confirm the change below to complete the update.
            </Text>
            <Button style={button} href={confirmationUrl}>
              Confirm email change
            </Button>
            <Hr style={divider} />
            <Text style={footerStrong}>Didn't request this?</Text>
            <Text style={footer}>
              If you didn't request this change, please secure your account
              immediately by resetting your password.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default EmailChangeEmail
