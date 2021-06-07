import '../env'

import { expect } from 'chai'
import { ClaimMetadata, CredentialRequirement, OfferedCredential, SignedCredential } from '../../src/dto/shared.dto'
import { CommonNetworkMember } from '../../src/CommonNetworkMember'
import { getVCEmailPersonV1Context, VCSEmailPersonV1 } from '@affinidi/vc-data'
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

  it('should implement VC building & signing', async () => {
    const credentialSubject: VCSEmailPersonV1 = {
      data: {
        '@type': ['Person', 'PersonE', 'EmailPerson'],
        email: 'bobbelcher@gmail.com',
        name: 'Bob Belcher',
      },
    }

    const claimMetadata: ClaimMetadata = {
      context: getVCEmailPersonV1Context(),
      type: ['EmailCredentialPersonV1'],
    }

    const signedCredential = await issuer.signCredential(credentialSubject, claimMetadata, {
      requesterDid: holder.did,
    })

    expect(signedCredential).to.exist
  })

  describe('[with offered VC]', () => {
    let credentials: VCV1[]

    before(async () => {
      // Offer VC flow
      const offeredCredentials: OfferedCredential[] = [{ type: 'EmailCredentialPersonV1' }]
      const credentialOfferRequestToken = await issuer.generateCredentialOfferRequestToken(offeredCredentials)

      const credentialOfferResponseToken = await holder.createCredentialOfferResponseToken(credentialOfferRequestToken)

      const offerVerification = await issuer.verifyCredentialOfferResponseToken(
        credentialOfferResponseToken,
        credentialOfferRequestToken,
      )

      expect(offerVerification.isValid).to.be.true

      const credentialSubject: VCSEmailPersonV1 = {
        data: {
          '@type': ['Person', 'PersonE', 'EmailPerson'],
          email: 'bobbelcher@gmail.com',
          name: 'Bob Belcher',
        },
      }

      const claimMetadata: ClaimMetadata = {
        context: getVCEmailPersonV1Context(),
        type: ['EmailCredentialPersonV1'],
      }

      const signedCredential = await issuer.signCredential(credentialSubject, claimMetadata, {
        credentialOfferResponseToken,
      })

      credentials = [signedCredential]
    })

    it('should implement VC share flow (JWT)', async () => {
      const credentialRequirements: CredentialRequirement[] = [
        { type: ['VerifiableCredential', 'EmailCredentialPersonV1'] },
      ]
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
      const credentialRequirements: CredentialRequirement[] = [
        { type: ['VerifiableCredential', 'EmailCredentialPersonV1'] },
      ]
      const presentationChallenge = await verifier.generatePresentationChallenge(credentialRequirements)

      const suppliedCredentials = holder.getShareCredential(presentationChallenge, { credentials })
      const presentation = await holder.createPresentationFromChallenge(
        presentationChallenge,
        suppliedCredentials as VCV1[],
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
