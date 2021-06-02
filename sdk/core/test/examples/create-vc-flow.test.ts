import { expect } from 'chai'
import { CredentialRequirement, OfferedCredential, SignedCredential } from '../../src/dto/shared.dto'
import { CommonNetworkMember } from '../../src/CommonNetworkMember'
import { getVCEducationPersonV1Context, VCSEducationPersonV1 } from '@affinidi/vc-data'
import { getOptionsForEnvironment } from '../helpers'

// 0 [Issuer] Create DID
// 0 [Holder] Create DID
// 1 [Issuer] Issue credential for Holder
// 2 [Verifier] Request VC from Holder
// 3 [Holder] Give VP to Verifier
// 4 [Verifier] Verify the VP (request to Issuer?)

describe('[Offer VC flow]', () => {
  it('should implement offer VC flow', async () => {
    const options = getOptionsForEnvironment()
    const universityPassword = 'university-password-123'
    const studentPassword = 'student-password-123'
    const theaterPassword = 'theater-password-123'

    // ---

    // 0 [Issuer] Create DID
    console.log('0 issuer')
    const { encryptedSeed: universityEncryptedSeed } = await CommonNetworkMember.register(universityPassword, options)
    const university = new CommonNetworkMember(universityPassword, universityEncryptedSeed, options)

    // 0 [Holder] Create DID
    console.log('0 holder')
    const { encryptedSeed: studentEncryptedSeed } = await CommonNetworkMember.register(studentPassword, options)
    const student = new CommonNetworkMember(studentPassword, studentEncryptedSeed, options)

    // 1 [Issuer] Issue credential for Holder
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

    console.log('1 create offer request')
    const credentialOfferRequestToken = await university.generateCredentialOfferRequestToken(offeredCredentials)

    console.log('1 create offer response')
    const credentialOfferResponseToken = await student.createCredentialOfferResponseToken(credentialOfferRequestToken)

    console.log('1 verify offer response')
    const offerVerification = await university.verifyCredentialOfferResponseToken(
      credentialOfferResponseToken,
      credentialOfferRequestToken,
    )
    console.log(offerVerification)

    console.log('1 sign credential')
    const signedCredential = await university.signCredential(credentialSubject, credentialMetadata, {
      credentialOfferResponseToken,
      requesterDid: student.did,
    })

    // 2 [Verifier] Request VC from Holder

    console.log('2 verifier')
    const { encryptedSeed: theaterEncryptedSeed } = await CommonNetworkMember.register(theaterPassword, options)
    const theater = new CommonNetworkMember(theaterPassword, theaterEncryptedSeed, options)

    const credentialRequirements: CredentialRequirement[] = [{ type: ['EducationPersonV1'] }]

    console.log('2 create share request')
    const credentialShareRequestToken = await theater.generateCredentialShareRequestToken(
      credentialRequirements,
      undefined,
      options,
    )

    // 3 [Holder] Give VP to Verifier
    // TODO: why need type casting?
    const suppliedCredentials: SignedCredential[] = [signedCredential as SignedCredential]

    console.log('3 create share response')
    const credentialShareResponseToken = await student.createCredentialShareResponseToken(
      credentialShareRequestToken,
      suppliedCredentials,
    )

    // 4 [Verifier] Verify the VP (request to Issuer?)
    console.log('3 verify share response')
    const result2 = await theater.verifyCredentialShareResponseToken(
      credentialShareResponseToken,
      credentialShareRequestToken,
    )
    console.log(result2)
  })
})
