import { io } from "socket.io-client"
import { AppActions, AppState } from "./state"

export const socketIOUrl = `http://${import.meta.env.VITE_API_HOST}:${import.meta.env.VITE_API_PORT}/${import.meta.env.VITE_POLLS_NAMESPACE}`

type CreateSocketOptions = {
    socketIOUrl: string
    state: AppState
    actions: AppActions
}

export const createSocketWithHandlers = ({ socketIOUrl, state, actions }: CreateSocketOptions) => {
    console.log(`Create socket with token ${state.accessToken}`)

    const socket = io(socketIOUrl, {
        auth: {
            token: state.accessToken,
        },
        transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
        console.log(`Connected socket with id ${socket.id} userId ${state.me?.id} joining room ${state.poll?.id}`)
        actions.stopLoading()
    })

    socket.on('connect_error', () => {
        console.log("failed to connect")

        actions.addWsError({type: 'Connection error', message: "Failed to connect"})

        actions.stopLoading()
    })

    socket.on('exception', (error) => {
        console.log('WS exception', error)
        actions.addWsError(error)
    })

    socket.on('poll_updated', (poll) => {
        console.log(poll)
        actions.updatePoll(poll)
    })

    return socket
}