import * as React from 'react'
import {
  Body,
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
  codeStyle,
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

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your SifoBooks verification code</Preview>
    <Body style={main}>
      <Section style={wrapper}>
        <Container style={container}>
          <Section style={headerBand}>
            <Heading as="h2" style={brandName}>SifoBooks</Heading>
            <Text style={brandTag}>Verification code</Text>
          </Section>
          <Section style={body}>
            <Heading style={h1}>Confirm it's you</Heading>
            <Text style={text}>Use the code below to confirm your identity:</Text>
            <Text style={codeStyle}>{token}</Text>
            <Hr style={divider} />
            <Text style={footerStrong}>Didn't request this?</Text>
            <Text style={footer}>
              This code expires shortly. If you didn't request it, you can safely
              ignore this email — no changes were made to your account.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default ReauthenticationEmail
