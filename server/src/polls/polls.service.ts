import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AddNominationFields, AddParticipantFields, CreatePollFields, JoinPollFields, RejoinPollFields, SubmitRankingsFields } from 'src/types/Poll.type';
import { createNominationId, createPollId, createUserId } from 'src/utils/ids';
import { PollsRepository } from './polls.repository';
import { JwtService } from '@nestjs/jwt';
import { Poll } from 'shared';
import getResults from 'src/utils/getResults';

@Injectable()
export class PollsService {
    private readonly logger = new Logger(PollsService.name)
    constructor(private readonly pollsRepository: PollsRepository, private readonly jwtService: JwtService) { }
    async createPoll(fields: CreatePollFields) {
        const pollId = createPollId()
        const userId = createUserId()

        const createdPoll = await this.pollsRepository.createPoll({
            ...fields,
            pollId,
            userId
        })

        this.logger.debug(`Creating token for poll: ${createdPoll.id}, and user: ${userId}`)

        const signedString = this.jwtService.sign({ pollId: createdPoll.id, name: fields.name, userId: userId })

        return {
            poll: createdPoll,
            accessToken: signedString
        }
    }

    async getPoll(pollId: string): Promise<Poll> {
        return this.pollsRepository.getPoll(pollId)
    }

    async joinPoll(fields: JoinPollFields) {
        const userId = createUserId()

        this.logger.debug(`Fetching poll with id: ${fields.pollId} for user ${userId}`)

        const joinedPoll = await this.pollsRepository.getPoll(fields.pollId)

        this.logger.debug(`Creating token for poll: ${joinedPoll.id}, and user: ${userId}`)

        const signedString = this.jwtService.sign({ pollId: joinedPoll.id, name: fields.name, userId: userId })

        return { poll: joinedPoll, accessToken: signedString }
    }
    async rejoinPoll(fields: RejoinPollFields) {
        this.logger.debug(`Rejoining poll with id: ${fields.pollId} for user ${fields.userId}:${fields.name}`)

        const joinedPoll = await this.pollsRepository.addParticipant(fields)

        return joinedPoll
    }

    async addParticipant(addParticipant: AddParticipantFields): Promise<Poll> {
        return this.pollsRepository.addParticipant(addParticipant)
    }

    async removeParticipant(pollId: string, userId: string): Promise<Poll | void> {
        const poll = await this.pollsRepository.getPoll(pollId)

        if (!poll.hasStarted) {
            const updatedPoll = await this.pollsRepository.removeParticipant(pollId, userId)
            return updatedPoll
        }
    }

    async addNomination({ pollId, userId, text }: AddNominationFields): Promise<Poll> {
        return this.pollsRepository.addNomination({
            pollId, nominationId: createNominationId(),
            nomination: { userId, text }
        })
    }

    async removeNomination(pollId: string, nominationId: string): Promise<Poll> {
        return this.pollsRepository.removeNomination(pollId, nominationId)
    }

    async startPoll(pollId: string): Promise<Poll> {
        return this.pollsRepository.startPoll(pollId)
    }

    async submitRankings(rankingsData: SubmitRankingsFields): Promise<Poll> {
        const hasPollStarted = this.pollsRepository.getPoll(rankingsData.pollId)

        if (!hasPollStarted) {
            throw new BadRequestException(`Can't submit until start`)
        }

        return this.pollsRepository.addParticipantRankings(rankingsData)
    }

    async computeResults(pollId: string): Promise<Poll> {
        const poll = await this.pollsRepository.getPoll(pollId)

        const results = getResults(poll.rankings, poll.nominations, poll.votesPerVoter)

        return this.pollsRepository.addResults(pollId, results)
    }

    async cancelPoll(pollId: string): Promise<void>{
        await this.pollsRepository.deletePoll(pollId)
    }
}
