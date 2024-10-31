import { Request } from "express"
import { Socket } from "socket.io"

export type AuthPayload = {
    userId: string
    pollId: string
    name: string
}

export type RequestWithAuth = Request & AuthPayload
export type SocketWithAuth = Socket & AuthPayload