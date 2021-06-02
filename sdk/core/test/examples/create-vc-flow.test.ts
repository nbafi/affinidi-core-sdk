import { expect } from 'chai'
import { CredentialRequirement, OfferedCredential, SignedCredential } from '../../src/dto/shared.dto'
import { CommonNetworkMember } from '../../src/CommonNetworkMember'
import { getVCEducationPersonV1Context, VCSEducationPersonV1 } from '@affinidi/vc-data'
import { getOptionsForEnvironment } from '../helpers'
import cryptoRandomString from 'crypto-random-string'

// 0 [Issuer] Create DID
// 0 [Holder] Create DID
// 1 [Issuer] Issue credential for Holder
// 2 [Verifier] Request VC from Holder
// 3 [Holder] Give VP to Verifier
// 4 [Verifier] Verify the VP (request to Issuer?)

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

    // [Verifier] Request VC from Holder

    const theater: CommonNetworkMember = await CommonNetworkMember.signUp(theaterUsername, theaterPassword, options)

    const credentialRequirements: CredentialRequirement[] = [{ type: ['EducationPersonV1'] }]
    const credentialShareRequestToken = await theater.generateCredentialShareRequestToken(
      credentialRequirements,
      undefined,
      options,
    )

    // 3 [Holder] Give VP to Verifier
    const suppliedCredentials: SignedCredential[] = student.getShareCredential(credentialShareRequestToken, {
      credentials: [signedCredential],
    })

    const credentialShareResponseToken = await student.createCredentialShareResponseToken(
      credentialShareRequestToken,
      suppliedCredentials,
    )

    // 4 [Verifier] Verify the VP (request to Issuer?)
    const shareVerification = await theater.verifyCredentialShareResponseToken(
      credentialShareResponseToken,
      credentialShareRequestToken,
    )

    expect(shareVerification.isValid).to.be.true
  })
})
