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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={headerBand}>
            <Heading as="h2" style={brandName}>SifoBooks</Heading>
            <Text style={brandTag}>Team invitation</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>You're invited</Heading>
            <Text style={text}>
              You've been invited to join{' '}
              <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>.
              Accept the invitation below to create your account and get access to
              the shared company workspace.
            </Text>
            <Button style={button} href={confirmationUrl}>
              Accept invitation
            </Button>
            <Hr style={divider} />
            <Text style={footerStrong}>Not expecting this?</Text>
            <Text style={footer}>
              If you weren't expecting this invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default InviteEmail
