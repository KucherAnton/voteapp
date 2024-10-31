import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { PollsService } from "./polls.service";
import { JwtService } from "@nestjs/jwt";
import { AuthPayload, SocketWithAuth } from "src/types/Auth.type";
import { WsUnauthorizedException } from "src/exceptions/ws-exceptions";

@Injectable()
export class GatewayAdminGuard implements CanActivate {
    private readonly logger = new Logger(GatewayAdminGuard.name)
    constructor(private readonly pollsService: PollsService, private readonly jwtService: JwtService){}
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const socket: SocketWithAuth = context.switchToWs().getClient()

        const token = socket.handshake.auth.token || socket.handshake.headers['token']
        
        if (!token) {
            this.logger.error(`No token`)
            throw new WsUnauthorizedException(`No token provided`)
        }

        try {
            const payload = this.jwtService.verify<AuthPayload>(token)

            this.logger.debug(`Validating token ${token}`)

            const { userId, pollId } = payload
            
            const poll = await this.pollsService.getPoll(pollId)

            if (userId !== poll.adminId) throw new WsUnauthorizedException(`You are not an admin`)
            
            return true
        } catch {
            throw new WsUnauthorizedException('You are not an admin')
        }
    }
}