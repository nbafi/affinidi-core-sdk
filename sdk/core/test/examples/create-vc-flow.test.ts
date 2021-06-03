import { expect } from 'chai'
import { CredentialRequirement, OfferedCredential, SignedCredential } from '../../src/dto/shared.dto'
import { CommonNetworkMember } from '../../src/CommonNetworkMember'
import { getVCEducationPersonV1Context, VCSEducationPersonV1 } from '@affinidi/vc-data'
import { getOptionsForEnvironment } from '../helpers'
import cryptoRandomString from 'crypto-random-string'

describe('[Offer VC flow]', () => {
  it('should implement offer VC flow', async () => {
    const options = getOptionsForEnvironment()
    const universityPassword = '!University-p4ssw0rd'
    const studentPassword = '!Student-p4ssw0rd'
    const theaterUsername = `fake.example.theater.${cryptoRandomString({ length: 10 })}`
    const theaterPassword = `!Theater-p4ssw0rd-${cryptoRandomString({ length: 10 })}`

    // ---

    // [Issuer] Create DID
    const { encryptedSeed: universityEncryptedSeed } = await CommonNetworkMember.register(universityPassword, options)
    const university = new CommonNetworkMember(universityPassword, universityEncryptedSeed, options)

    // [Holder] Create DID
    const { encryptedSeed: studentEncryptedSeed } = await CommonNetworkMember.register(studentPassword, options)
    const student = new CommonNetworkMember(studentPassword, studentEncryptedSeed, options)

    // [Issuer] Offer credential for Holder
    const credentialSubject: VCSEducationPersonV1 = {
      data: {
        '@type': ['Person', 'PersonE', 'EducationPerson'],
        name: 'Bob Belcher',
        hasCredential: {
          '@type': 'EducationalOcupationalCredential',
          credentialCategory: 'degree',
          educationalLevel: 'Bachelor of Science',
          recognizedBy: {
            '@type': ['Organization', 'OrganizationE'],
            name: 'University of New York',
          },
          dateCreated: '2020-12-07',
          url: 'https://www.university.edu/credential/credentialId',
        },
      },
    }

    const credentialMetadata = {
      context: [getVCEducationPersonV1Context()],
      name: 'Education',
      type: ['EducationPersonV1'],
    }

    const offeredCredentials: OfferedCredential[] = [{ type: 'EducationPersonV1' }]

    const credentialOfferRequestToken = await university.generateCredentialOfferRequestToken(offeredCredentials)

    // [Holder] Accept credential from Issuer
    const credentialOfferResponseToken = await student.createCredentialOfferResponseToken(credentialOfferRequestToken)

    // [Issuer] Validate Holder's response
    const offerVerification = await university.verifyCredentialOfferResponseToken(
      credentialOfferResponseToken,
      credentialOfferRequestToken,
    )

    expect(offerVerification.isValid).to.be.true

    // [Issuer] Sign credential
    const signedCredential = await university.signCredential(credentialSubject, credentialMetadata, {
      credentialOfferResponseToken,
      requesterDid: student.did,
    })

    const credentials = [signedCredential]

    // [Verifier] Request VC from Holder
    const theater: CommonNetworkMember = await CommonNetworkMember.signUp(theaterUsername, theaterPassword, options)
    console.log(theater.password)

    const credentialRequirements: CredentialRequirement[] = [{ type: ['VerifiableCredential', 'EducationPersonV1'] }]
    const credentialShareRequestToken = await theater.generateCredentialShareRequestToken(
      credentialRequirements,
      undefined,
      options,
    )

    // [Holder] Give VC to Verifier
    const suppliedCredentials: SignedCredential[] = student.getShareCredential(credentialShareRequestToken, {
      credentials,
    })

    const credentialShareResponseToken = await student.createCredentialShareResponseToken(
      credentialShareRequestToken,
      suppliedCredentials,
    )

    // [Verifier] Verify the VC
    const shareVerification = await theater.verifyCredentialShareResponseToken(
      credentialShareResponseToken,
      credentialShareRequestToken,
    )

    expect(shareVerification.isValid).to.be.true
    expect(shareVerification.suppliedCredentials).to.deep.eq(suppliedCredentials)

    // [Verifier] Request VP from Holder
    const presentationChallenge = await theater.generatePresentationChallenge(credentialRequirements)

    // [Holder] Create VP for the Issuer
    const presentation = await student.createPresentationFromChallenge(
      presentationChallenge,
      credentials,
      'http://example.com',
    )

    // [Verifier] Verify the VP
    const presentationVerification = await theater.verifyPresentation(presentation)
    const { verifiableCredential } = presentationVerification.suppliedPresentation as {
      verifiableCredential: SignedCredential[]
    }

    expect(presentationVerification.isValid).to.be.true
    expect(verifiableCredential).to.deep.eq(suppliedCredentials)
  })
})
