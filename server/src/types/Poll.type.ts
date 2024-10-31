import { Nomination } from "shared"

export type CreatePollFields = { 
    topic: string
    votesPerVoter: number
    name: string
}

export type JoinPollFields = {
    pollId: string
    name: string
}

export type RejoinPollFields = {
    pollId: string
    userId: string
    name: string
}

export type CreatePollData = {
    pollId: string
    topic: string
    votesPerVoter: number
    userId: string
}

export type AddParticipantData = {
    pollId: string
    userId: string
    name: string
}

export type AddParticipantFields = {
    pollId: string,
    userId: string,
    name: string
}

export type AddNominationData = {
    pollId: string
    nominationId: string
    nomination: Nomination
}

export type AddNominationFields = {
    pollId: string
    userId: string
    text: string
}

export type AddParticipantRankingsData = {
    pollId: string
    userId: string
    rankings: string[]
}

export type SubmitRankingsFields = {
    pollId: string
    userId: string
    rankings: string[]
}