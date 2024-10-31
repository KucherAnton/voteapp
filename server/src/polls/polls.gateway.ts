import { Logger, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { PollsService } from "./polls.service";
import { Namespace } from "socket.io";
import { SocketWithAuth } from "src/types/Auth.type";
import { WsBadRequestException } from "src/exceptions/ws-exceptions";
import { GatewayAdminGuard } from "./gateway-admin.guard";
import { NominationDto } from "src/dto/Poll.dto";

@UsePipes(new ValidationPipe())
@WebSocketGateway({ namespace: "polls", cors: {origin: []} })
export class PollsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(PollsGateway.name)
    constructor(private readonly pollsService: PollsService) { }
    
    @WebSocketServer() io: Namespace

    afterInit(): void {
        this.logger.log(`Websocket gateway init`)
    }
    
    async handleConnection(client: SocketWithAuth) {
        const sockets = this.io.sockets
        
        this.logger.debug(`Socket connected with ${client.userId}, to ${client.pollId}, and name ${client.name}`)
        this.logger.log(`WS client with id ${client.id} is connected`)
        this.logger.debug(`Number of connected sockets: ${sockets.size}`)
        
        const roomName = client.pollId
        await client.join(roomName)

        const connectedClients = this.io.adapter.rooms?.get(roomName)?.size ?? 0

        this.logger.debug(`userId ${client.userId} joined room ${roomName}`)
        this.logger.debug(`total clients connected to ${roomName}: ${connectedClients}`)

        const updatedPoll = await this.pollsService.addParticipant({
            pollId: client.pollId,
            userId: client.userId,
            name: client.name
        })

        this.io.to(roomName).emit('poll_updated', updatedPoll)
    }

    async handleDisconnect(client: SocketWithAuth ) {
        const sockets = this.io.sockets
        const { pollId, userId } = client
        const updatedPoll = await this.pollsService.removeParticipant(pollId, userId)
        const roomName = client.pollId
        const clientCount = this.io.adapter.rooms?.get(roomName)?.size ?? 0

        this.logger.log(`WS client with id ${client.id} is disconnected`)
        this.logger.debug(`Number of connected sockets: ${sockets.size}`)
        this.logger.debug(`total clients connected to ${roomName}: ${clientCount}`)

        if (updatedPoll) {
            this.io.to(roomName).emit('poll_updated',updatedPoll)
        }
    }

    @UseGuards(GatewayAdminGuard)
    @SubscribeMessage('remove_participant')
    async removeParticipant(@MessageBody('id') id: string, @ConnectedSocket() client: SocketWithAuth) {
        this.logger.debug(`Attempt to remove participant ${id} from poll ${client.pollId}`)
        
        const updatedPoll = await this.pollsService.removeParticipant(client.pollId, id)

        if (updatedPoll) {
            this.io.to(client.pollId).emit("poll_updated", updatedPoll) 
        }
    }

    @SubscribeMessage("nominate")
    async nominate(@MessageBody() nomination: NominationDto,
        @ConnectedSocket() client: SocketWithAuth): Promise<void> {
        this.logger.debug(`Attempt to add nomination for ${client.userId} to poll ${client.pollId}\n${nomination.text}`)
        
        const updatedPoll = await this.pollsService.addNomination({
            pollId: client.pollId,
            userId: client.userId,
            text: nomination.text
        })

        this.io.to(client.pollId).emit('poll_updated', updatedPoll)
    }

    @UseGuards(GatewayAdminGuard)
    @SubscribeMessage("remove_nomination")
    async removeNomination(@MessageBody('id') nominationId: string,
        @ConnectedSocket() client: SocketWithAuth): Promise<void> {
        this.logger.debug(`Attempt to remove nomination ${nominationId} from poll ${client.pollId}`)
        
        const updatedPoll = await this.pollsService.removeNomination(client.pollId, nominationId)

        this.io.to(client.pollId).emit('poll_updated', updatedPoll)
    }

    @UseGuards(GatewayAdminGuard)
    @SubscribeMessage('start_vote')
    async startVote(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
        this.logger.debug(`Attemp to start voting for poll ${client.pollId}`)

        const updatedPoll = await this.pollsService.startPoll(client.pollId)

        this.io.to(client.pollId).emit('poll_updated', updatedPoll)
    }

    @SubscribeMessage('submit_rankings')
    async submitRankings(@ConnectedSocket() client: SocketWithAuth, @MessageBody('rankings') rankings: string[]): Promise<void> {
        this.logger.debug(`Submit votes for user ${client.userId}, to ${client.pollId}`)

        const updatedPoll = await this.pollsService.submitRankings({
            pollId: client.pollId,
            userId: client.userId,
            rankings
        })

        this.io.to(client.pollId).emit('poll_updated', updatedPoll)
    }

    @UseGuards(GatewayAdminGuard)
    @SubscribeMessage('close_poll')
    async closePoll(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
        this.logger.debug(`Attemp to close poll ${client.pollId}`)

        const updatedPoll = await this.pollsService.computeResults(client.pollId)

        this.io.to(client.pollId).emit('poll_updated', updatedPoll)
    }

    @UseGuards(GatewayAdminGuard)
    @SubscribeMessage('cancel_poll')
    async cancelPoll(@ConnectedSocket() client: SocketWithAuth): Promise<void> {
        this.logger.debug(`Attemp to cancel poll ${client.pollId}`)

        await this.pollsService.cancelPoll(client.pollId)

        this.io.to(client.pollId).emit('poll_canceled')
    }
}