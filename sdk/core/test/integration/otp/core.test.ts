import 'mocha'
import '../env'

import { expect } from 'chai'
import { SdkError } from '@affinidi/common'
import {
  AffinidiWalletV6 as AffinidiWallet,
  AffinidiWallet as LegacyAffinidiWallet,
  checkIsWallet,
} from '../../helpers/AffinidiWallet'
import { SdkOptions } from '../../../src/dto/shared.dto'

import { generateUsername, getBasicOptionsForEnvironment, testSecrets } from '../../helpers'
import { MessageParameters } from '../../../dist/dto'
import { TestmailInbox } from '../../../src/test-helpers'

const parallel = require('mocha.parallel')

const { COGNITO_PASSWORD } = testSecrets

const options = getBasicOptionsForEnvironment()
const { env } = options

const messageParameters: MessageParameters = {
  message: `Your verification code is: {{CODE}}`,
  subject: `Verification code`,
}

const waitForOtpCode = async (inbox: TestmailInbox): Promise<string> => {
  const { body } = await inbox.waitForNewEmail()
  return body.replace('Your verification code is: ', '')
}

const createInbox = () => new TestmailInbox({ prefix: env, suffix: 'otp.core' })
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function checkIsString(value: string | unknown): asserts value is string {
  expect(value).to.be.a('string')
}

parallel('CommonNetworkMember [OTP]', () => {
  it('sends email with OTP code using the provided template (message parameters) when #signIn is called', async () => {
    const inbox = createInbox()

    const timestamp = String(Date.now())
    await AffinidiWallet.initiateSignInPasswordless(options, inbox.email, {
      message: `Your verification code is: {{CODE}} #${timestamp}`,
      subject: `Code {{CODE}} #${timestamp}`,
    })

    const { subject, body } = await inbox.waitForNewEmail()
    const [messageCode, messageTimestamp] = body.replace('Your verification code is: ', '').split(' #')

    expect(subject).to.equal(`Code {{CODE}} #${timestamp}`) // code should not be replaced due to Cognito's security policy
    expect(messageTimestamp).to.equal(timestamp)
    expect(messageCode).to.be.lengthOf(6)
    expect(Number(messageCode)).not.to.be.NaN
  })

  it('#signIn with skipBackupEncryptedSeed, #storeEncryptedSeed, #signIn', async () => {
    const inbox = createInbox()

    const signInToken = await AffinidiWallet.initiateSignInPasswordless(options, inbox.email, messageParameters)
    checkIsString(signInToken)
    const signInCode = await waitForOtpCode(inbox)

    const optionsWithSkippedBackupEncryptedSeed: SdkOptions = {
      ...options,
      skipBackupEncryptedSeed: true,
    }

    const { wallet: originalWallet } = await AffinidiWallet.completeSignInPasswordless(
      optionsWithSkippedBackupEncryptedSeed,
      signInToken,
      signInCode,
    )

    checkIsWallet(originalWallet)
    const { password, encryptedSeed } = originalWallet
    const { accessToken } = JSON.parse(originalWallet.serializeSession())

    const legacyWallet = new LegacyAffinidiWallet(password, encryptedSeed, options)
    await legacyWallet.storeEncryptedSeed('', '', accessToken)
    await legacyWallet.signOut(options)

    const signInToken2 = await AffinidiWallet.initiateSignInPasswordless(options, inbox.email, messageParameters)
    checkIsString(signInToken2)
    const signInCode2 = await waitForOtpCode(inbox)

    const result = await AffinidiWallet.completeSignInPasswordless(options, signInToken2, signInCode2)
    checkIsWallet(result.wallet)
  })

  it('registers new user after confirmation code from the first call to #signIn was ignored; #signUpConfirm returns { isNew: true }', async () => {
    const inbox = createInbox()

    await AffinidiWallet.initiateSignUpByEmail(options, inbox.email, null, messageParameters)
    await waitForOtpCode(inbox) // ignore first OTP code

    const signInToken = await AffinidiWallet.initiateSignInPasswordless(options, inbox.email, messageParameters)
    checkIsString(signInToken)
    const signInCode = await waitForOtpCode(inbox)

    const { isNew, wallet } = await AffinidiWallet.completeSignInPasswordless(options, signInToken, signInCode)

    expect(isNew).to.be.true
    checkIsWallet(wallet)
  })

  it('changes forgotten password after email was changed for user registered with email and password', async () => {
    const inbox = createInbox()
    const password = COGNITO_PASSWORD

    const signUpToken = await AffinidiWallet.initiateSignUpByEmail(options, inbox.email, password, messageParameters)
    checkIsString(signUpToken)
    const signUpCode = await waitForOtpCode(inbox)

    let commonNetworkMember = await AffinidiWallet.completeSignUp(options, signUpToken, signUpCode)
    checkIsWallet(commonNetworkMember)

    const newInbox = createInbox()

    const changeToken = await commonNetworkMember.initiateChangeEmail(newInbox.email, messageParameters)
    const changeUsernameCode = await waitForOtpCode(newInbox)

    await commonNetworkMember.completeChangeEmailOrPhone(changeToken, changeUsernameCode)
    await commonNetworkMember.logOut()

    commonNetworkMember = await AffinidiWallet.logInWithPassword(options, newInbox.email, password)
    checkIsWallet(commonNetworkMember)

    await commonNetworkMember.logOut()

    const forgotToken = await AffinidiWallet.initiateForgotPassword(options, newInbox.email, messageParameters)
    const forgotPasswordCode = await waitForOtpCode(newInbox)

    const newPassword = `${password}_updated`
    await AffinidiWallet.completeForgotPassword(options, forgotToken, forgotPasswordCode, newPassword)

    commonNetworkMember = await AffinidiWallet.logInWithPassword(options, newInbox.email, newPassword)
    checkIsWallet(commonNetworkMember)
  })

  it('changes forgotten password after email was changed for user registered with email but without password', async () => {
    const inbox = createInbox()

    const signUpToken = await AffinidiWallet.initiateSignUpByEmail(options, inbox.email, null, messageParameters)
    checkIsString(signUpToken)
    const signUpCode = await waitForOtpCode(inbox)

    let commonNetworkMember = await AffinidiWallet.completeSignUp(options, signUpToken, signUpCode)
    checkIsWallet(commonNetworkMember)

    await commonNetworkMember.logOut()

    const forgotToken = await AffinidiWallet.initiateForgotPassword(options, inbox.email, messageParameters)
    const forgotPasswordCode = await waitForOtpCode(inbox)

    const password = COGNITO_PASSWORD
    await AffinidiWallet.completeForgotPassword(options, forgotToken, forgotPasswordCode, password)

    commonNetworkMember = await AffinidiWallet.logInWithPassword(options, inbox.email, password)
    checkIsWallet(commonNetworkMember)

    const newInbox = createInbox()

    const changeToken = await commonNetworkMember.initiateChangeEmail(newInbox.email, messageParameters)
    const changeUsernameCode = await waitForOtpCode(newInbox)

    await commonNetworkMember.completeChangeEmailOrPhone(changeToken, changeUsernameCode)
    await commonNetworkMember.logOut()

    commonNetworkMember = await AffinidiWallet.logInWithPassword(options, newInbox.email, password)
    checkIsWallet(commonNetworkMember)
  })

  it('confirms signing up with resent confirmation code; allows to sign in with a correct confirmation code after 1 call to #confirmSignIn with wrong confirmation code', async () => {
    const inbox = createInbox()
    const password = COGNITO_PASSWORD

    const signUpToken = await AffinidiWallet.initiateSignUpByEmail(options, inbox.email, password, messageParameters)
    checkIsString(signUpToken)
    await waitForOtpCode(inbox) // skip first OTP code

    await AffinidiWallet.resendSignUp(options, signUpToken, messageParameters)
    const newSignUpCode = await waitForOtpCode(inbox)

    const commonNetworkMember = await AffinidiWallet.completeSignUp(options, signUpToken, newSignUpCode)
    checkIsWallet(commonNetworkMember)

    await commonNetworkMember.logOut()

    const signInToken = await AffinidiWallet.initiateSignInPasswordless(options, inbox.email, messageParameters)
    checkIsString(signInToken)

    try {
      await AffinidiWallet.completeSignInPasswordless(options, signInToken, '123456')
      expect.fail('Expected it to throw')
    } catch (error) {
      expect(error).to.be.instanceOf(SdkError)
      expect(error.name).to.equal('COR-5')
    }

    const signInCode = await waitForOtpCode(inbox)

    const result = await AffinidiWallet.completeSignInPasswordless(options, signInToken, signInCode)
    checkIsWallet(result.wallet)
  })

  it('throws COR-13 at the third call to #confirmSignIn with wrong confirmation code', async () => {
    const inbox = createInbox()
    const password = COGNITO_PASSWORD

    const signUpToken = await AffinidiWallet.initiateSignUpByEmail(options, inbox.email, password, messageParameters)
    checkIsString(signUpToken)
    const signUpCode = await waitForOtpCode(inbox)

    const commonNetworkMember = await AffinidiWallet.completeSignUp(options, signUpToken, signUpCode)
    checkIsWallet(commonNetworkMember)

    await commonNetworkMember.logOut()

    const loginToken = await AffinidiWallet.initiateSignInPasswordless(options, inbox.email)
    checkIsString(loginToken)

    let error
    try {
      await AffinidiWallet.completeSignInPasswordless(options, loginToken, '123456')
    } catch (err) {
      error = err
    }

    expect(error).to.be.instanceOf(SdkError)
    expect(error.name).to.eql('COR-5')

    try {
      await AffinidiWallet.completeSignInPasswordless(options, loginToken, '123456')
    } catch (err) {
      error = err
    }

    expect(error).to.be.instanceOf(SdkError)
    expect(error.name).to.eql('COR-5')

    try {
      await AffinidiWallet.completeSignInPasswordless(options, loginToken, '123456')
    } catch (err) {
      error = err
    }

    expect(error).to.be.instanceOf(SdkError)
    expect(error.name).to.eql('COR-13')
  })

  it('logs in with email and new password after adding email to username-only account and changing password', async () => {
    const username = generateUsername()
    const password = COGNITO_PASSWORD

    let commonNetworkMember = await AffinidiWallet.signUpWithUsername(options, username, password)
    checkIsWallet(commonNetworkMember)

    const inbox = createInbox()

    const changeToken = await commonNetworkMember.initiateChangeEmail(inbox.email, messageParameters)
    const changeUsernameCode = await waitForOtpCode(inbox)

    await commonNetworkMember.completeChangeEmailOrPhone(changeToken, changeUsernameCode)
    await commonNetworkMember.logOut()

    commonNetworkMember = await AffinidiWallet.logInWithPassword(options, inbox.email, password)
    checkIsWallet(commonNetworkMember)

    const newPassword = `${password}_updated`

    await commonNetworkMember.changePassword(password, newPassword)
    await commonNetworkMember.logOut()

    commonNetworkMember = await AffinidiWallet.logInWithPassword(options, inbox.email, newPassword)
    checkIsWallet(commonNetworkMember)
  })

  describe('for confirmed user registered with email and no password', () => {
    const createUser = async () => {
      const inbox = createInbox()

      const signUpToken = await AffinidiWallet.initiateSignUpByEmail(options, inbox.email, null, messageParameters)
      checkIsString(signUpToken)
      const signUpCode = await waitForOtpCode(inbox)

      const originalNetworkMember = await AffinidiWallet.completeSignUp(options, signUpToken, signUpCode)

      return { inbox, originalNetworkMember }
    }

    it('logs user in without password using #signIn and #confirmSignIn', async () => {
      const { inbox } = await createUser()
      const signInToken = await AffinidiWallet.initiateSignInPasswordless(options, inbox.email, messageParameters)
      checkIsString(signInToken)
      const signInCode = await waitForOtpCode(inbox)

      const result = await AffinidiWallet.completeSignInPasswordless(options, signInToken, signInCode)

      expect(result.isNew).to.be.false
      checkIsWallet(result.wallet)
      expect(result.wallet.did).to.exist
    })

    it('sends email with OTP code using the provided template (message parameters) when #passwordlessLogin is called', async () => {
      const { inbox } = await createUser()
      const timestamp = String(Date.now())
      await AffinidiWallet.initiateLogInPasswordless(options, inbox.email, {
        message: `Your verification code is: {{CODE}} #${timestamp}`,
        subject: `Code {{CODE}} #${timestamp}`,
      })

      const { body } = await inbox.waitForNewEmail()
      const [messageCode, messageTimestamp] = body.replace('Your verification code is: ', '').split(' #')

      // TODO: update "create-auth-challenge" lambda script to not to replace {{CODE}} in the subject
      // expect(subject).to.equal(`Code {{CODE}} #${timestamp}`) // should not be replaced due to Cognito's security policy
      expect(messageCode).to.be.lengthOf(6)
      expect(Number(messageCode)).not.to.be.NaN
      expect(messageTimestamp).to.equal(timestamp)
    })

    it('logs user in without password using #passwordlessLogin and #completeLoginChallenge', async () => {
      const { inbox } = await createUser()
      const loginToken = await AffinidiWallet.initiateLogInPasswordless(options, inbox.email, messageParameters)
      const loginCode = await waitForOtpCode(inbox)

      const commonNetworkMember = await AffinidiWallet.completeLogInPasswordless(options, loginToken, loginCode)
      checkIsWallet(commonNetworkMember)
      expect(commonNetworkMember.did).to.exist
    })

    it.skip('throws COR-13 at attempt to call #completeLoginChallenge with expired confirmation code', async function () {
      this.timeout(200_000)
      const { inbox } = await createUser()
      const loginToken = await AffinidiWallet.initiateLogInPasswordless(options, inbox.email, messageParameters)
      const loginCode = await waitForOtpCode(inbox)

      await wait(180_000) // wait for 3 minutes before completing the login challenge

      let error
      try {
        await AffinidiWallet.completeLogInPasswordless(options, loginToken, loginCode)
      } catch (err) {
        error = err
      }

      expect(error).to.be.instanceOf(SdkError)
      expect(error.name).to.eql('COR-17')
    })

    it('throws "COR-7" at attempt to call #signUp with the same email and some password', async () => {
      const { inbox } = await createUser()
      const password = COGNITO_PASSWORD

      let error
      try {
        await AffinidiWallet.initiateSignUpByEmail(options, inbox.email, password)
      } catch (err) {
        error = err
      }

      expect(error).to.be.instanceOf(SdkError)
      expect(error.name).to.eql('COR-7')
    })

    it('throws "COR-7" at attempt to change email of the newly registered (with email) account to the one used at the registration of the existing account', async () => {
      const { inbox } = await createUser()
      const newInbox = createInbox()
      const password = COGNITO_PASSWORD

      const signUpToken = await AffinidiWallet.initiateSignUpByEmail(
        options,
        newInbox.email,
        password,
        messageParameters,
      )
      checkIsString(signUpToken)
      const signUpCode = await waitForOtpCode(newInbox)

      const commonNetworkMember = await AffinidiWallet.completeSignUp(options, signUpToken, signUpCode)
      checkIsWallet(commonNetworkMember)

      let error
      try {
        await commonNetworkMember.initiateChangeEmail(inbox.email)
      } catch (err) {
        error = err
      }

      expect(error).to.be.instanceOf(SdkError)
      expect(error.name).to.eql('COR-7')
    })

    it('allows to change email after password was reset for user registered with email', async () => {
      const { inbox, originalNetworkMember } = await createUser()
      await originalNetworkMember.logOut()

      const newInbox = createInbox()
      const newPassword = COGNITO_PASSWORD

      {
        const token = await AffinidiWallet.initiateForgotPassword(options, inbox.email, messageParameters)
        const forgotPasswordCode = await waitForOtpCode(inbox)
        await AffinidiWallet.completeForgotPassword(options, token, forgotPasswordCode, newPassword)
      }

      {
        const commonNetworkMember = await AffinidiWallet.logInWithPassword(options, inbox.email, newPassword)
        checkIsWallet(commonNetworkMember)

        const changeToken = await commonNetworkMember.initiateChangeEmail(newInbox.email, messageParameters)
        const changeUsernameOtp = await waitForOtpCode(newInbox)

        await commonNetworkMember.completeChangeEmailOrPhone(changeToken, changeUsernameOtp)
        await commonNetworkMember.logOut()
      }

      {
        const commonNetworkMember = await AffinidiWallet.logInWithPassword(options, newInbox.email, newPassword)
        checkIsWallet(commonNetworkMember)
      }
    })
  })
})
