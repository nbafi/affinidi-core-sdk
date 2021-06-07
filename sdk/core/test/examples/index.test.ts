import '../env'

import { expect } from 'chai'
import { CredentialRequirement, OfferedCredential, SignedCredential } from '../../src/dto/shared.dto'
import { CommonNetworkMember } from '../../src/CommonNetworkMember'
import { getVCEducationPersonV1Context, VCSEducationPersonV1 } from '@affinidi/vc-data'
import { getOptionsForEnvironment } from '../helpers'
import { VCV1 } from '@affinidi/vc-common'

const { accessApiKey } = getOptionsForEnvironment()

describe('[examples]', () => {
  let issuerPassword: string
  let holderPassword: string
  let verifierPassword: string

  let issuer: CommonNetworkMember
  let holder: CommonNetworkMember
  let verifier: CommonNetworkMember

  before(async () => {
    // Register & create DID
    issuerPassword = 'Issuer-p4ssw0rd'
    holderPassword = 'Holder-p4ssw0rd'
    verifierPassword = `Verifier-p4ssw0rd`

    const options = { accessApiKey }

    const { encryptedSeed: issuerEncryptedSeed } = await CommonNetworkMember.register(issuerPassword, options)
    issuer = new CommonNetworkMember(issuerPassword, issuerEncryptedSeed, options)

    const { encryptedSeed: holderEncryptedSeed } = await CommonNetworkMember.register(holderPassword, options)
    holder = new CommonNetworkMember(holderPassword, holderEncryptedSeed, options)

    const { encryptedSeed: verifierEncryptedSeed } = await CommonNetworkMember.register(verifierPassword, options)
    verifier = new CommonNetworkMember(verifierPassword, verifierEncryptedSeed, options)
  })

  describe('[with offered VC]', () => {
    let credentials: VCV1[]

    before(async () => {
      // Offer VC flow
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

      const claimMetadata = {
        context: [getVCEducationPersonV1Context()],
        name: 'Education',
        type: ['EducationPersonV1'],
      }

      const offeredCredentials: OfferedCredential[] = [{ type: 'EducationPersonV1' }]

      const credentialOfferRequestToken = await issuer.generateCredentialOfferRequestToken(offeredCredentials)

      const credentialOfferResponseToken = await holder.createCredentialOfferResponseToken(credentialOfferRequestToken)

      const offerVerification = await issuer.verifyCredentialOfferResponseToken(
        credentialOfferResponseToken,
        credentialOfferRequestToken,
      )

      expect(offerVerification.isValid).to.be.true

      const signedCredential = await issuer.signCredential(credentialSubject, claimMetadata, {
        credentialOfferResponseToken,
        requesterDid: holder.did,
      })

      credentials = [signedCredential]
    })

    it('should implement VC share flow (JWT)', async () => {
      // Share VC flow (JWT)
      const credentialRequirements: CredentialRequirement[] = [{ type: ['VerifiableCredential', 'EducationPersonV1'] }]
      const credentialShareRequestToken = await verifier.generateCredentialShareRequestToken(credentialRequirements)

      const suppliedCredentials = holder.getShareCredential(credentialShareRequestToken, { credentials })

      const credentialShareResponseToken = await holder.createCredentialShareResponseToken(
        credentialShareRequestToken,
        suppliedCredentials,
      )

      const shareVerification = await verifier.verifyCredentialShareResponseToken(
        credentialShareResponseToken,
        credentialShareRequestToken,
      )

      expect(shareVerification.isValid).to.be.true
      expect(shareVerification.suppliedCredentials).to.deep.eq(suppliedCredentials)
    })

    it('should implement VP share flow (W3C)', async () => {
      // Share VP flow
      const credentialRequirements: CredentialRequirement[] = [{ type: ['VerifiableCredential', 'EducationPersonV1'] }]
      const presentationChallenge = await verifier.generatePresentationChallenge(credentialRequirements)

      const suppliedCredentials = holder.getShareCredential(presentationChallenge, { credentials })

      const presentation = await holder.createPresentationFromChallenge(
        presentationChallenge,
        credentials,
        'http://verifier.example.com',
      )

      const presentationVerification = await verifier.verifyPresentation(presentation)
      const { verifiableCredential } = presentationVerification.suppliedPresentation as {
        verifiableCredential: SignedCredential[]
      }

      expect(presentationVerification.isValid).to.be.true
      expect(verifiableCredential).to.deep.eq(suppliedCredentials)
    })
  })
})
