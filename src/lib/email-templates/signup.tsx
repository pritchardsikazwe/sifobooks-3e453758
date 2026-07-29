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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {siteName} — confirm your email to get started</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={headerBand}>
            <Heading as="h2" style={brandName}>SifoBooks</Heading>
            <Text style={brandTag}>Zambian enterprise accounting</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Welcome aboard 👋</Heading>
            <Text style={text}>
              Thanks for creating your{' '}
              <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>{' '}
              account. Please confirm{' '}
              <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>{' '}
              to activate your workspace and unlock ledgers, payroll, and reporting.
            </Text>
            <Button style={button} href={confirmationUrl}>
              Confirm my email
            </Button>
            <Hr style={divider} />
            <Text style={footerStrong}>Need help?</Text>
            <Text style={footer}>
              If you didn't create a SifoBooks account, you can safely ignore this email.
              Questions? Reply to this message and our team will be in touch.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default SignupEmail
