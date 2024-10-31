import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Observable } from "rxjs";
import { RequestWithAuth } from "src/types/Auth.type";

@Injectable()
export class ControllerAuthGuard implements CanActivate {
    private readonly logger = new Logger(ControllerAuthGuard.name)
    constructor(private readonly jwtService: JwtService) { }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const req: RequestWithAuth = context.switchToHttp().getRequest()

        this.logger.debug(`Checking auth token`, req.body)

        const {accessToken} = req.body

        try {
            const payload = this.jwtService.verify(accessToken)
            req.name = payload.name
            req.userId = payload.userId
            req.pollId = payload.pollId
            return true
        } catch (e) {
            throw new ForbiddenException('Invalid token: ', e)
        }
    }
}