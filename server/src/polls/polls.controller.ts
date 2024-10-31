import { Body, Controller, Logger, Post, Req, UseFilters, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreatePollDto, JoinPollDto } from 'src/dto/Poll.dto';
import { PollsService } from './polls.service';
import { ControllerAuthGuard } from './controller-auth.guard';
import { RequestWithAuth } from 'src/types/Auth.type';
import { WsCatchAllFilter } from 'src/exceptions/ws-catch-all-filter';

@UsePipes(new ValidationPipe())
@UseFilters(new WsCatchAllFilter())
@Controller('polls')
export class PollsController {
    constructor(private pollsService: PollsService) {}

    @Post()
    async create(@Body() createPollDto: CreatePollDto) {
        const result = await this.pollsService.createPoll(createPollDto)
        return result
    }

    @Post('/join')
    async join(@Body() joinPollDto: JoinPollDto) {
        const result = await this.pollsService.joinPoll(joinPollDto)
        return result
    }

    @UseGuards(ControllerAuthGuard)
    @Post('/rejoin')
    async rejoin(@Req() request: RequestWithAuth) {
        const {userId, pollId, name} = request
        const result = await this.pollsService.rejoinPoll({
            name,
            pollId,
            userId
        })

        return result
    }
}
