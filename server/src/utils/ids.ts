import { customAlphabet, nanoid } from "nanoid";

export const createPollId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6)
export const createUserId = () => nanoid()
export const createNominationId = () => nanoid(8)