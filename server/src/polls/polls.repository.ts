import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { IORedisKey } from "src/redis.module";
import { AddNominationData, AddParticipantData, AddParticipantRankingsData, CreatePollData } from "src/types/Poll.type";
import { Poll, Results } from "shared"

@Injectable()
export class PollsRepository {
    private readonly ttl: string
    private readonly logger = new Logger(PollsRepository.name)

    constructor(
        configService: ConfigService,
        @Inject(IORedisKey) private readonly redisClient: Redis,
    ) {
        this.ttl = configService.get('POLL_DURATION')
    }

    async createPoll({ votesPerVoter, topic, pollId, userId }: CreatePollData): Promise<Poll> {
        const initialPoll = {
            id: pollId,
            topic,
            votesPerVoter,
            participants: {},
            adminId: userId,
            hasStarted: false,
            nominations: {},
            rankings: {},
            results: []
        }

        this.logger.log(`Creating new poll: ${JSON.stringify(initialPoll, null, 2)} with TTL ${this.ttl}`)

        const key = `polls:${pollId}`

        try {
            await this.redisClient.multi([["send_command", "JSON.SET", key, ".", JSON.stringify(initialPoll)], ['expire', key, this.ttl]]).exec()
            return initialPoll
        } catch (err: any) {
            this.logger.error(`Failed to add poll: ${JSON.stringify(initialPoll)}\n${err}`)
            throw new InternalServerErrorException()
        }
    }

    async getPoll(pollId: string): Promise<Poll> {
        this.logger.log(`Attemp to get poll with: ${pollId}`)

        const key = `polls:${pollId}`

        try {
            const currentPoll = await this.redisClient.send_command("JSON.GET", key, '.')

            this.logger.verbose(currentPoll)

            // if(currentPoll?.hasStarted) {
            //  throw new BadRequestExeption('The poll has already started') 
            //}
            
            return JSON.parse(currentPoll)
        } catch (e) {
            this.logger.error(`Fail to get pollId ${pollId}`)
            throw e
        }
    }

    async addParticipant({ pollId, userId, name }: AddParticipantData): Promise<Poll> {
        this.logger.log(`Attemp to add participant with: ${userId}/${name} to ${pollId}`)

        const key = `polls:${pollId}`
        const participantPath = `.participants.${userId}`

        try {
            await this.redisClient.send_command("JSON.SET", key, participantPath, JSON.stringify(name))

            return this.getPoll(pollId)

        } catch (e) {
            this.logger.error(`Fail to add participant with ${userId}/${name} to pollId ${pollId}`)
            throw e
        }
    }

    async removeParticipant(pollId: string, userId: string): Promise<Poll> {
        this.logger.log(`Attemp to remove participant with: ${userId} from ${pollId}`)

        const key = `polls:${pollId}`
        const participantPath = `.participants.${userId}`

        try {
            await this.redisClient.send_command("JSON.DEL", key, participantPath)

            return this.getPoll(pollId)
        } catch (e) {
            this.logger.error(`Fail to remove participant with ${userId} from pollId ${pollId}`)
            throw new InternalServerErrorException('Fail to remove participant')
        }
    }

    async addNomination({
        pollId, nominationId, nomination
    }: AddNominationData): Promise<Poll> {
        this.logger.log(`Attempt to add nomination with ${nominationId}/${nomination.text} to ${pollId}`)

        const key = `polls:${pollId}`
        const nominationPath = `.nominations.${nominationId}`

        try {
            await this.redisClient.send_command('JSON.SET', key, nominationPath, JSON.stringify(nomination))
            return this.getPoll(pollId)
        } catch (e) {
            throw new InternalServerErrorException(`Fail to add nomination with ${nominationId}/${nomination.text} to ${pollId}`)
        }
    }

    async removeNomination(pollId:string, nominationId: string): Promise<Poll> {
        this.logger.log(`Attempt to remove nomination with ${nominationId} from ${pollId}`)

        const key = `polls:${pollId}`
        const nominationPath = `.nominations.${nominationId}`

        try {
            await this.redisClient.send_command('JSON.DEL', key, nominationPath)
            return this.getPoll(pollId)
        } catch (e) {
            throw new InternalServerErrorException(`Fail to remove nomination with ${nominationId} from ${pollId}`)
        }
    }

    async startPoll(pollId: string): Promise<Poll> {
        this.logger.log(`Starting poll ${pollId}`)

        const key = `polls:${pollId}`

        try {
            await this.redisClient.send_command('JSON.SET', key, '.hasStarted', JSON.stringify(true))

            return this.getPoll(pollId)
        } catch (e) {
            throw new InternalServerErrorException('Fail to start a poll')
        }
    }

    async addParticipantRankings({ pollId, userId, rankings }: AddParticipantRankingsData): Promise<Poll> {
        this.logger.log(`Attempt to add rankings for ${userId} to poll ${pollId}, ${rankings}`)

        const key = `polls:${pollId}`
        const rankingsPath = `.rankings.${userId}`

        try {
            await this.redisClient.send_command("JSON.SET", key, rankingsPath, JSON.stringify(rankings))

            return this.getPoll(pollId)
        } catch (e) {
            throw new InternalServerErrorException(`Error in adding rankings`)
        }
    }

    async addResults(pollId: string, results: Results): Promise<Poll> {
        this.logger.log(`Attempt to add results to ${pollId} with ${JSON.stringify(results)}`)

        const key = `polls:${pollId}`
        const resultsPath = '.results'

        try {
            await this.redisClient.send_command('JSON.SET', key, resultsPath, JSON.stringify(results))
            return this.getPoll(pollId)
        } catch (e) {
            throw new InternalServerErrorException(`Failed to add results`)
        }
    }

    async deletePoll(pollId: string): Promise<void> {
        const key = `polls:${pollId}`
        this.logger.log(`Deleting poll ${pollId}`)

        try {
            await this.redisClient.send_command("JSON.DEL", key)
        } catch (e){
            throw new InternalServerErrorException(`Failed to delete poll ${pollId}`)
        }
    }
}