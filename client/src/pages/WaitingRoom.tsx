import React, { useEffect, useState } from 'react'
import { actions, state } from '../state'
import { useCopyToClipboard } from 'react-use'
import { useSnapshot } from 'valtio'
import { colorizeText } from '../util'
import { MdContentCopy, MdPeopleOutline } from 'react-icons/md'
import { BsPencilSquare } from 'react-icons/bs'
import ConfirmationDialog from '../components/ui/ConfirmationDialog'
import ParticipantList from '../components/ParticipantList'
import NominationForm from '../components/NominationForm'

const WaitingRoom: React.FC = () => {
    const [_copiedText, copyToClipboard] = useCopyToClipboard()
    const [isParticipantsListOpen, setIsParticipantsListOpen] = useState(false)
    const [isNominationFormOpen, setIsNominationFormOpen] = useState(false)
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
    const [confirmationMessage, setConfirmationMessage] = useState('')
    const [participantToRemove, setParticipantToRemove] = useState<string>()
    const [showConfirmation, setShowConfirmation] = useState(false)

    const currentState = useSnapshot(state)

    const confirmRemoveParticipant = (id: string) => {
        setConfirmationMessage(`Remove ${currentState.poll?.participants[id]} from poll?`)
        setParticipantToRemove(id)
        setIsConfirmationOpen(true)
    }

    const submitRemoveParticipant = () => {
        participantToRemove && actions.removeParticipant(participantToRemove)
        setIsConfirmationOpen(false)
    }

    useEffect(() => {
        actions.initializeSocket()
    }, [])
  
    return (
        <>
            <div className='flex flex-col w-full justify-between items-center h-full'>
                <div>
                    <h2 className='text-center'> Poll Topic</h2>
                    <p className='italic text-center mb-4'>{currentState.poll?.topic}</p>
                    <h2 className='text-center'>Poll ID</h2>
                    <h3 className='text-center mb-2'>Click to copy!</h3>
                    <div className='mb-4 flex justify-center align-middle cursor-pointer'
                    onClick={() => copyToClipboard(currentState.poll?.id || '')}>
                        <div className='font-extrabold text-center mr-2'>{currentState.poll && colorizeText(currentState.poll?.id)}</div>
                        <MdContentCopy size={24}/>
                    </div>
                </div>
                <div className='flex justify-center'>
                    <button className='box btn-orange mx-2 pulsate' onClick={() => setIsParticipantsListOpen(true)}>
                        <MdPeopleOutline size={24} />
                        <span>{currentState.participantCount}</span>
                    </button>
                    <button className='box btn-purple mx-2 pulsate' onClick={() => setIsNominationFormOpen(true)}>
                        <BsPencilSquare size={24} />
                        <span>{currentState.nominationCount}</span>
                    </button>
                </div>
                <div className='flex flex-col justify-center'>
                    {currentState.isAdmin ? (
                        <>
                            <div className='my-2 italic'>
                                {currentState.poll?.votesPerVoter} Nominations Required to Start
                            </div>
                            <button className='box btn-orange my-2'
                                disabled={!currentState.canStartVote}
                                onClick={() => actions.startVote()}
                            >
                                Start Voting
                            </button>
                        </>
                    ) : (
                            <div className='my-2 italic'>
                                Waiting for Admin, {' '}
                                <span className='font-semibold'>{currentState.poll?.participants[currentState.poll?.adminId]}</span>
                                , to Start Voting
                            </div>
                    )}
                    <button className='box btn-purple my-2' onClick={() => setShowConfirmation(true)}>Leave Poll</button>
                    <ConfirmationDialog
                        message="You'll leave Poll"
                        showDialog={showConfirmation}
                        onCancel={() => setShowConfirmation(false)}
                        onConfirm={() => actions.startOver()}
                    />
                </div>
            </div>
            <ParticipantList
                isOpen={isParticipantsListOpen}
                onClose={() => setIsParticipantsListOpen(false)}
                participants={currentState.poll?.participants}
                onRemoveParticipant={confirmRemoveParticipant}
                isAdmin={currentState.isAdmin || false}
                userID={currentState.me?.id}
            />
            <NominationForm
                title={currentState.poll?.topic}
                isOpen={isNominationFormOpen}
                onClose={() => setIsNominationFormOpen(false)}
                onSubmitNomination={(nominationText) => actions.nominate(nominationText)}
                nominations={currentState.poll?.nominations}
                userID={currentState.me?.id}
                onRemoveNomination={(nominationId) => actions.removeNomination(nominationId)}
                isAdmin={currentState.isAdmin || false}
            />
            <ConfirmationDialog
                showDialog={isConfirmationOpen}
                message={confirmationMessage}
                onConfirm={() => submitRemoveParticipant()}
                onCancel={() => setIsConfirmationOpen(false)}
            />
        </>
  )
}

export default WaitingRoom