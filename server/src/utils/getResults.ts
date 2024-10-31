import { Nominations, Rankings, Results } from "shared";

export default (rankings: Rankings, nominations: Nominations, votesPerVoter: number): Results => {
    const scores: { [nominationId: string]: number } = {}
    
    Object.values(rankings).forEach((userRankings) => {
        userRankings.forEach((nominationId, n) => {
            const voteValue = Math.pow(
                (votesPerVoter - 0.5 * n)/votesPerVoter, n+1
            )

            scores[nominationId] = (scores[nominationId] ?? 0) + voteValue
        })
    })

    const results = Object.entries(scores).map(([nominationId, score]) => ({
        nominationId,
        nominationText: nominations[nominationId].text,
        score
    }))

    results.sort((res1, res2) => res2.score - res1.score)

    return results
}